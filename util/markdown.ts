import {
	escapeMarkdown,
	formatEmoji,
	type Snowflake,
	Faces,
	MessageMentions,
	FormattingPatterns,
} from "discord.js";
import SimpleMarkdown from "@khanacademy/simple-markdown";
import twemojiRegexp from "@twemoji/parser/dist/lib/regex.js";
import { toCodePoints } from "@twemoji/parser";
import { client } from "strife.js";
import config from "../common/config.js";

export function escapeMessage(text: string): string {
	return escapeMarkdown(text, {
		heading: true,
		bulletedList: true,
		numberedList: true,
		maskedLink: true,
	});
}

export function stripMarkdown(text: string): string {
	return text.replaceAll(
		/(?<!\\)\\|```\S*\s+(.+?)\s*```|(?<!\\)\*\*(.+?)(?<!\\)\*\*|(?<!\\)__(.+?)(?<!\\)__|(?<!\\\*?)\*(.+?)(?<!\\|\*)\*|(?<!\\_?)_(.+?)(?<!\\|_)_|~~(.+?)(?<!\\)~~|`(.+?)(?<!\\|`)`|^> (.+?)/gms,
		"$1$2$3$4$5$6$7$8",
	);
}

export function formatAnyEmoji(
	options:
		| { animated?: boolean | null; id: Snowflake; name?: string | null }
		| { animated?: false | null; id?: null; name: string }
		| { animated?: false | null; id?: null; name?: null }
		| null
		| undefined,
): string {
	return typeof options?.id === "string"
		? formatEmoji({
				...options,
				animated: options.animated ?? false,
				name: options.name ?? undefined,
		  })
		: options?.name ?? "_";
}

const DATE_TYPE_FORMATS = {
	t: { timeStyle: "short" },
	T: { timeStyle: "medium" },
	d: { dateStyle: "short" },
	D: { dateStyle: "long" },
	f: { dateStyle: "long", timeStyle: "short" },
	F: { dateStyle: "full", timeStyle: "short" },
} as const;
const { defaultRules, htmlTag } = SimpleMarkdown.default;
type ASTNode = SimpleMarkdown.SingleASTNode | SimpleMarkdown.SingleASTNode[];

export const rules = {
	...Object.fromEntries(
		(
			["autolink", "em", "escape", "inlineCode", "paragraph", "strong", "u", "url"] as const
		).map((rule) => [
			rule,
			{
				...defaultRules[rule],
				match: (source) => defaultRules[rule].match.regex?.exec(source),
			},
		]),
	),
	blockQuote: {
		...defaultRules.blockQuote,
		match: (source, { inQuote }, previous) =>
			inQuote || !/(?:^|(?:\n|\s*[*-])\s*)$/.test(previous)
				? undefined
				: /^ *(?:>>> [^]*|> .*(?:\n *> .*)*\n?)/.exec(source),
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
		match: (source, { inline }) => (inline ? /^~~([^]+?)~~(?!_)/.exec(source) : undefined),
	},
	codeBlock: {
		...defaultRules.codeBlock,
		match: (source) => /^```(?:([\w-]+)\n)?\n*([^]+?)\n*```/i.exec(source),
		parse: (capture) => ({ lang: capture[1] ?? "", content: capture[2] ?? "" }),
	},
	heading: {
		...defaultRules.heading,
		match: (source, { inline }) =>
			inline ? undefined : /^ *(#{1,3}) +(.+?)(?:\n\s*)+/.exec(source),
	},
	link: {
		...defaultRules.link,
		html(node, output, state) {
			const href = SimpleMarkdown.default.sanitizeUrl(node.target as string);
			const url = href && new URL(href);
			if (url && ["discord.com", "ptb.discord.com", "discord.com"].includes(url.hostname)) {
				url.hostname = "discord.com";
				const parts = url.pathname.split("/");
				if (
					parts[1] === "channels" &&
					parts[2] === config.guild.id &&
					parts[3] &&
					parts.length === 4
				) {
					return htmlTag("a", output(node.content as ASTNode, state), {
						href: `/suggestions/${parts[3]}`,
						title: node.title as string,
					});
				}
			}

			return htmlTag("a", output(node.content as ASTNode, state), {
				href: href,
				title: node.title as string,
				target: "_blank",
				rel: "noreferrer",
			});
		},
	},
	list: {
		...defaultRules.list,
		match: (source) =>
			/^( *)([*-]|\d+\.) .+(?:\n|$)(?: *(?:[*-]|\d+\.) .+(?:\n|$))*/.exec(source),
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
			const content = node.content as string;
			const codePoints = toCodePoints(
				content.includes("\u200D") ? content : content.replaceAll("\uFE0F", ""),
			).join("-");
			return htmlTag("img", "", {
				src: SimpleMarkdown.default.sanitizeUrl(
					`https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/${codePoints}.svg`,
				),
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
		html: (node) => {
			const name = `:${(typeof node.name === "string" && node.name) || "_"}:`;
			return htmlTag("img", "", {
				src: SimpleMarkdown.default.sanitizeUrl(
					`https://cdn.discordapp.com/emojis/${
						(typeof node.id === "string" && node.id) || "0"
					}.${node.animated ? "gif" : "webp"}?size=96&quality=lossless`,
				),
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
			htmlTag("span", output(node.content as SimpleMarkdown.SingleASTNode[], state), {
				class: "discord-spoiler",
			}),
	},
	timestamp: {
		order: defaultRules.strong.order,
		match: (source) => /^<t:(\d+)(?::([DFRTdft]))?>/.exec(source),
		parse: (capture) => ({
			timestamp: capture[1],
			format: capture[2] && capture[2] in DATE_TYPE_FORMATS ? capture[2] : "f",
		}),
		html: (node, output, state) =>
			htmlTag(
				"span",
				output(
					{
						type: "text",
						content: new Date(+node.timestamp * 1000).toLocaleString(
							[],
							DATE_TYPE_FORMATS[node.format as keyof typeof DATE_TYPE_FORMATS],
						),
					},
					state,
				),
				{ class: "discord-time" },
			),
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
							channel && !channel.isDMBased()
								? `#${channel.name}`
								: (node.content as string),
					},
					state,
				),
				{
					class: "discord-mention",
					href: `/suggestions/${node.id as string}`,
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
			htmlTag("span", output({ type: "text", content: `/${fullName as string}` }, state), {
				class: "discord-mention",
			}),
	},
	massMention: {
		order: defaultRules.strong.order,
		match(source) {
			const match = MessageMentions.EveryonePattern.exec(source);
			return match?.index ? undefined : match;
		},
		parse: (capture) => ({ content: capture[0] }),
		html: (node, output, state) =>
			htmlTag("span", output({ type: "text", content: node.content as string }, state), {
				class: "discord-mention",
			}),
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
					{ type: "text", content: role ? `@${role.name}` : (node.content as string) },
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
						content: user ? `@${user.displayName}` : (node.content as string),
					},
					state,
				),
				{ class: "discord-mention" },
			);
		},
	},
} satisfies SimpleMarkdown.HtmlRules;
const rawParser = SimpleMarkdown.default.parserFor(rules);

export function parseMarkdown(source: string): SimpleMarkdown.SingleASTNode[] {
	return rawParser(source.trim(), { inline: false });
}
const rawOutputter = SimpleMarkdown.default.outputFor(rules, "html");
export function markdownToHtml(source: string): string {
	return rawOutputter(parseMarkdown(source)) as string;
}
