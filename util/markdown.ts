import type { Rules, SingleASTNode } from "@khanacademy/simple-markdown";

import SimpleMarkdown from "@khanacademy/simple-markdown";
import { toCodePoints } from "@twemoji/parser";
import twemojiRegexp from "@twemoji/parser/dist/lib/regex.js";
import { Faces, FormattingPatterns, MessageMentions } from "discord.js";
import { client } from "strife.js";

import config from "../common/config.js";

const DATE_TYPE_FORMATS = {
	t: { timeStyle: "short" },
	T: { timeStyle: "medium" },
	d: { dateStyle: "short" },
	D: { dateStyle: "long" },
	f: { dateStyle: "long", timeStyle: "short" },
	F: { dateStyle: "full", timeStyle: "short" },
} as const;

const { default: markdown } = SimpleMarkdown;

export const rules = {
	...Object.fromEntries(
		(
			["autolink", "em", "escape", "inlineCode", "paragraph", "strong", "u", "url"] as const
		).map((rule) => [
			rule,
			{
				...markdown.defaultRules[rule],
				match: (source) => markdown.defaultRules[rule].match.regex?.exec(source),
			},
		]),
	),
	blockQuote: {
		...markdown.defaultRules.blockQuote,
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
	br: { ...markdown.defaultRules.br, match: (source) => /^\n(?!\n*$)/i.exec(source) },
	del: {
		...markdown.defaultRules.del,
		match: (source, { inline }) => (inline ? /^~~([^]+?)~~(?!_)/.exec(source) : undefined),
	},
	codeBlock: {
		...markdown.defaultRules.codeBlock,
		match: (source) => /^```(?:([\w-]+)\n)?\n*([^]+?)\n*```/i.exec(source),
		parse: (capture) => ({ lang: capture[1] ?? "", content: capture[2] ?? "" }),
	},
	heading: {
		...markdown.defaultRules.heading,
		match: (source, { inline }) =>
			inline ? undefined : /^ *(#{1,3}) +(.+?)(?:\n\s*)+/.exec(source),
	},
	link: {
		...markdown.defaultRules.link,
		html(node, output, state) {
			const href = markdown.sanitizeUrl(
				typeof node.target === "string" ? node.target : undefined,
			);
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
				) {
					return markdown.htmlTag("a", output(node.content as SingleASTNode[], state), {
						href: `/suggestions/${parts[3]}`,
						title: typeof node.title === "string" ? node.title : "",
					});
				}
			}

			return markdown.htmlTag("a", output(node.content as SingleASTNode[], state), {
				href: href,
				title: typeof node.title === "string" ? node.title : "",
				target: "_blank",
				rel: "noreferrer",
			});
		},
	},
	list: {
		...markdown.defaultRules.list,
		match: (source) =>
			/^( *)([*-]|\d+\.) .+(?:\n|$)(?: *(?:[*-]|\d+\.) .+(?:\n|$))*/.exec(source),
	},
	text: {
		...markdown.defaultRules.text,
		match: (source) => /^[^]+?(?=[^\s\w]|\n{1,2}|\w+:\S|$)/.exec(source),
	},

	emoticon: {
		...markdown.defaultRules.text,
		match(source) {
			const emoticon = Object.values(Faces).find((emoticon) => source.startsWith(emoticon));
			return emoticon && [emoticon];
		},
	},
	twemoji: {
		order: markdown.defaultRules.strong.order,
		match(source) {
			const match = twemojiRegexp.default.exec(source);
			return match?.index ? undefined : match;
		},
		parse: (capture) => ({ content: capture[0] }),
		html(node) {
			const content = typeof node.content === "string" ? node.content : "";
			return markdown.htmlTag("img", "", {
				src: getTwemojiUrl(content),
				alt: content,
				draggable: false,
				class: "discord-custom-emoji",
			});
		},
	},
	emoji: {
		order: markdown.defaultRules.strong.order,
		match(source) {
			const match = /<(?<animated>a)?:(?<name>\w{1,32}):(?<id>\d{17,20})>/.exec(source);
			return match?.index ? undefined : match;
		},
		parse: (capture) => ({ animated: capture[1] === "a", name: capture[2], id: capture[3] }),
		html(node) {
			const name = `:${(typeof node.name === "string" && node.name) || "emoji"}:`;
			return markdown.htmlTag("img", "", {
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
		match: (source) => /^\|\|([^]+?)\|\|/.exec(source),
		parse: ([, capture = ""], parse, state) => ({ content: parse(capture, state) }),
		html: (node, output, state) =>
			markdown.htmlTag("span", output(node.content as SingleASTNode[], state), {
				class: "discord-spoiler",
			}),
	},
	timestamp: {
		order: markdown.defaultRules.strong.order,
		match: (source) => /^<t:(\d+)(?::([DFRTdft]))?>/.exec(source),
		parse: (capture) => ({ timestamp: capture[1], format: capture[2] }),
		html(node, output, state) {
			const date = new Date(+(typeof node.timestamp === "string" && node.timestamp) * 1000);
			const format =
				typeof node.format === "string" &&
				Object.keys(DATE_TYPE_FORMATS).includes(node.format) &&
				node.format;
			const formatOptions = DATE_TYPE_FORMATS[format || "f"];

			return markdown.htmlTag(
				"span",
				output({ type: "text", content: date.toLocaleString([], formatOptions) }, state),
				{ class: "discord-time" },
			);
		},
	},
	channel: {
		order: markdown.defaultRules.strong.order,
		match(source) {
			const match = MessageMentions.ChannelsPattern.exec(source);
			return match?.index ? undefined : match;
		},
		parse: (capture) => ({ id: capture[1], content: capture[0] }),
		html(node, output, state) {
			const channel = typeof node.id === "string" && client.channels.cache.get(node.id);
			return markdown.htmlTag(
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
		order: markdown.defaultRules.strong.order,
		match(source) {
			const match = FormattingPatterns.SlashCommand.exec(source);
			return match?.index || !match?.groups?.fullName ? undefined : [match.groups.fullName];
		},
		parse: ([fullName]) => ({ fullName }),
		html: ({ fullName }, output, state) =>
			markdown.htmlTag(
				"span",
				output(
					{ type: "text", content: `/${typeof fullName === "string" ? fullName : ""}` },
					state,
				),
				{ class: "discord-mention" },
			),
	},
	massMention: {
		order: markdown.defaultRules.strong.order,
		match(source) {
			const match = MessageMentions.EveryonePattern.exec(source);
			return match?.index ? undefined : match;
		},
		parse: (capture) => ({ content: capture[0] }),
		html: (node, output, state) =>
			markdown.htmlTag(
				"span",
				output(
					{ type: "text", content: typeof node.content === "string" ? node.content : "" },
					state,
				),
				{ class: "discord-mention" },
			),
	},
	role: {
		order: markdown.defaultRules.strong.order,
		match(source) {
			const match = MessageMentions.RolesPattern.exec(source);
			return match?.index ? undefined : match;
		},
		parse: (capture) => ({ id: capture[1], content: capture[0] }),
		html(node, output, state) {
			const role = typeof node.id === "string" && config.guild.roles.cache.get(node.id);
			return markdown.htmlTag(
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
		order: markdown.defaultRules.strong.order,
		match(source) {
			const match = MessageMentions.UsersPattern.exec(source);
			return match?.index ? undefined : match;
		},
		parse: (capture) => ({ id: capture[1], content: capture[0] }),
		html(node, output, state) {
			const user = typeof node.id === "string" && client.users.cache.get(node.id);
			return markdown.htmlTag(
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
const rawParser = markdown.parserFor(rules);

export function parseMarkdown(source: string): SingleASTNode[] {
	return rawParser(source.trim(), { inline: false });
}
const rawOutputter = markdown.outputFor(rules, "html");
export function markdownToHtml(source: string): string {
	return rawOutputter(parseMarkdown(source));
}

export const getTwemojiUrl = (emoji: string) =>
	`https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/${toCodePoints(
		emoji.includes("\u200D") ? emoji : emoji.replaceAll("\uFE0F", ""),
	).join("-")}.svg` as const;
