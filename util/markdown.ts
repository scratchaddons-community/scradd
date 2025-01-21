import type { Rules, SingleASTNode } from "@khanacademy/simple-markdown";

import SimpleMarkdown from "@khanacademy/simple-markdown";
import { toCodePoints } from "@twemoji/parser";
import twemojiRegexp from "@twemoji/parser/dist/lib/regex.js";
import twemojiPackage from "@twemoji/parser/package.json" with { type: "json" };
import { Faces, FormattingPatterns, MessageMentions } from "discord.js";
import { client } from "strife.js";

import config from "../common/config.ts";
import { formatDuration } from "./numbers.ts";

const DATE_TYPE_FORMATS = {
	t: { timeStyle: "short" },
	T: { timeStyle: "medium" },
	d: { dateStyle: "short" },
	D: { dateStyle: "long" },
	f: { dateStyle: "long", timeStyle: "short" },
	F: { dateStyle: "full", timeStyle: "short" },
} as const;

const {
	default: { defaultRules, sanitizeUrl, htmlTag, parserFor, outputFor },
} = SimpleMarkdown;

export const rules = {
	...Object.fromEntries(
		(
			[
				"autolink",
				"em",
				"escape",
				"inlineCode",
				"list",
				"paragraph",
				"strong",
				"u",
				"url",
			] as const
		).map((rule) => [
			rule,
			{
				...defaultRules[rule],
				match:
					defaultRules[rule].match.regex ?
						(source) => defaultRules[rule].match.regex?.exec(source)
					:	defaultRules[rule].match,
			},
		]),
	),
	blockQuote: {
		...defaultRules.blockQuote,
		match: (source, { inQuote }, previous) =>
			inQuote || !/(?:^|(?:\n|\s*[*-])\s*)$/.test(previous) ?
				undefined
			:	/^ *(?:>>> [^]*|> .*(?:\n *> .*)*\n?)/.exec(source),
		parse: ([capture = ""], parse, state) => ({
			content: parse(
				capture.replace(capture.trim().startsWith(">>>") ? /^ *>>> ?/ : /^ *> ?/gm, ""),
				{ ...state, inQuote: true },
			),
		}),
	},
	br: { ...defaultRules.br, match: (source) => /^\n(?!\n*$)/i.exec(source) },
	del: {
		...defaultRules.del,
		// eslint-disable-next-line prefer-named-capture-group
		match: (source, { inline }) => (inline ? /^~~([^]+?)~~(?!_)/.exec(source) : undefined),
	},
	codeBlock: {
		...defaultRules.codeBlock,
		match: (source) => /^```(?:(?<lang>[\w-]+)\n)?\n*(?<content>[^]+?)\n*```/i.exec(source),
		parse: (capture) => ({
			lang: capture.groups?.lang ?? "",
			content: capture.groups?.content ?? "",
		}),
	},
	heading: {
		...defaultRules.heading,
		match: (source, { inline }) =>
			// eslint-disable-next-line prefer-named-capture-group
			inline ? undefined : /^ *(#{1,3}) +(.+?)(?:\n\s*)+/.exec(source),
	},
	link: {
		...defaultRules.link,
		html(node, output, state) {
			const href = sanitizeUrl(typeof node.target === "string" ? node.target : undefined);
			const url = href && new URL(href);
			if (
				url &&
				["discord.com", "ptb.discord.com", "canary.discord.com"].includes(url.hostname)
			) {
				url.hostname = "discord.com";
				const parts = url.pathname.split("/");
				if (
					parts[1] === "channels" &&
					parts[2] === config.guild.id &&
					parts[3] &&
					parts.length === 4
				)
					return htmlTag("a", output(node.content as SingleASTNode[], state), {
						href: `/suggestions/${parts[3]}`,
						title: typeof node.title === "string" ? node.title : "",
					});
			}

			return htmlTag("a", output(node.content as SingleASTNode[], state), {
				href,
				title: typeof node.title === "string" ? node.title : "",
				target: "_blank",
				rel: "noreferrer",
			});
		},
	},
	text: {
		...defaultRules.text,
		match: (source) => /^[^]+?(?=[^\s\w]|\n{1,2}|\w+:\S|$)/.exec(source),
	},

	emoticon: {
		...defaultRules.text,
		match(source) {
			const emoticon = Object.values(Faces).find((emoticon) => source.startsWith(emoticon));
			return emoticon && [emoticon];
		},
	},
	twemoji: {
		order: defaultRules.strong.order,
		match(source) {
			const match = twemojiRegexp.default.exec(source);
			return match?.index ? undefined : match;
		},
		parse: (capture) => ({ content: capture[0] }),
		html(node) {
			const content = typeof node.content === "string" ? node.content : "";
			return htmlTag("img", "", {
				src: getTwemojiUrl(content),
				alt: content,
				draggable: false,
				class: "discord-custom-emoji",
			});
		},
	},
	emoji: {
		order: defaultRules.strong.order,
		match(source) {
			const match = /<(?<animated>a)?:(?<name>\w{1,32}):(?<id>\d{17,20})>/.exec(source);
			return match?.index ? undefined : match;
		},
		parse: (capture) => ({ animated: capture[1] === "a", name: capture[2], id: capture[3] }),
		html(node) {
			const name = `:${(typeof node.name === "string" && node.name) || "emoji"}:`;
			return htmlTag("img", "", {
				src: client.rest.cdn.emoji(typeof node.id === "string" ? node.id : "0", {
					size: 128,
					extension: node.animated ? "gif" : "webp",
				}),
				alt: name,
				draggable: false,
				class: "discord-custom-emoji",
			});
		},
	},
	spoiler: {
		order: 0,
		match: (source) => /^\|\|(?<content>[^]+?)\|\|/.exec(source),
		parse: (capture, parse, state) => ({
			content: parse(capture.groups?.content ?? "", state),
		}),
		html: (node, output, state) =>
			htmlTag("span", output(node.content as SingleASTNode[], state), {
				class: "discord-spoiler",
			}),
	},
	timestamp: {
		order: defaultRules.strong.order,
		match: (source) => /^<t:(?<timestamp>\d+)(?::(?<format>[DFRTdft]))?>/.exec(source),
		parse: (capture) => ({
			timestamp: capture.groups?.timestamp,
			format: capture.groups?.format,
		}),
		html(node, output, state) {
			const milliseconds = +(typeof node.timestamp === "string" && node.timestamp) * 1000;
			if (node.format === "R") {
				const now = Date.now();
				const past = now > milliseconds;
				const duration = formatDuration(past ? now - milliseconds : milliseconds - now);
				return htmlTag(
					"span",
					output(
						{ type: "text", content: past ? `${duration} ago` : `in ${duration}` },
						state,
					),
					{ class: "discord-time" },
				);
			}
			const format =
				typeof node.format === "string" &&
				Object.keys(DATE_TYPE_FORMATS).includes(node.format) &&
				node.format;
			const formatOptions = DATE_TYPE_FORMATS[format || "f"];

			const date = new Date(milliseconds);
			return htmlTag(
				"span",
				output({ type: "text", content: date.toLocaleString([], formatOptions) }, state),
				{ class: "discord-time" },
			);
		},
	},
	channel: {
		order: defaultRules.strong.order,
		match(source) {
			const match = MessageMentions.ChannelsPattern.exec(source);
			return match?.index ? undefined : match;
		},
		parse: (capture) => ({ id: capture[1], content: capture[0] }),
		html(node, output, state) {
			const channel = typeof node.id === "string" && client.channels.cache.get(node.id);
			return htmlTag(
				"a",
				output(
					{
						type: "text",
						content:
							channel && !channel.isDMBased() ? `#${channel.name}`
							: typeof node.content === "string" ? node.content
							: "",
					},
					state,
				),
				{
					class: "discord-mention",
					href:
						channel ?
							!channel.isDMBased() && channel.guild.id === config.guild.id ?
								`/suggestions/${channel.id}`
							:	channel.url
						:	"",
					target: "_blank",
					rel: "noreferrer",
				},
			);
		},
	},
	command: {
		order: defaultRules.strong.order,
		match(source) {
			const match = FormattingPatterns.SlashCommand.exec(source);
			return match?.index || !match?.groups?.fullName ? undefined : [match.groups.fullName];
		},
		parse: ([fullName]) => ({ fullName }),
		html: ({ fullName }, output, state) =>
			htmlTag(
				"span",
				output(
					{ type: "text", content: `/${typeof fullName === "string" ? fullName : ""}` },
					state,
				),
				{ class: "discord-mention" },
			),
	},
	massMention: {
		order: defaultRules.strong.order,
		match(source) {
			const match = MessageMentions.EveryonePattern.exec(source);
			return match?.index ? undefined : match;
		},
		parse: (capture) => ({ content: capture[0] }),
		html: (node, output, state) =>
			htmlTag(
				"span",
				output(
					{ type: "text", content: typeof node.content === "string" ? node.content : "" },
					state,
				),
				{ class: "discord-mention" },
			),
	},
	role: {
		order: defaultRules.strong.order,
		match(source) {
			const match = MessageMentions.RolesPattern.exec(source);
			return match?.index ? undefined : match;
		},
		parse: (capture) => ({ id: capture[1], content: capture[0] }),
		html(node, output, state) {
			const role = typeof node.id === "string" && config.guild.roles.cache.get(node.id);
			return htmlTag(
				"span",
				output(
					{
						type: "text",
						content:
							role ? `@${role.name}`
							: typeof node.content === "string" ? node.content
							: "",
					},
					state,
				),
				{ class: "discord-mention" },
			);
		},
	},
	user: {
		order: defaultRules.strong.order,
		match(source) {
			const match = MessageMentions.UsersPattern.exec(source);
			return match?.index ? undefined : match;
		},
		parse: (capture) => ({ id: capture[1], content: capture[0] }),
		html(node, output, state) {
			const user = typeof node.id === "string" && client.users.cache.get(node.id);
			return htmlTag(
				"span",
				output(
					{
						type: "text",
						content:
							user ? `@${user.displayName}`
							: typeof node.content === "string" ? node.content
							: "",
					},
					state,
				),
				{ class: "discord-mention" },
			);
		},
	},
} satisfies Rules;
const rawParser = parserFor(rules);

export function parseMarkdown(source: string): SingleASTNode[] {
	return rawParser(source.trim(), { inline: false });
}
const rawOutputter = outputFor(rules, "html");
export function markdownToHtml(source: string): string {
	return rawOutputter(parseMarkdown(source));
}

export function getTwemojiUrl(
	emoji: string,
): `https://cdn.jsdelivr.net/gh/jdecked/twemoji@${string}/assets/svg/${string}.svg` {
	return `https://cdn.jsdelivr.net/gh/jdecked/twemoji@${twemojiPackage.version}/assets/svg/${toCodePoints(
		emoji.includes("\u200D") ? emoji : emoji.replaceAll("\uFE0F", ""),
	).join("-")}.svg` as const;
}
