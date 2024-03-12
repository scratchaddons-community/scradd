/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// TODO: actually type this

import { TimestampStyles, cleanCodeBlockContent, time, type APIEmbed } from "discord.js";
import { parser, type Node } from "posthtml-parser";
import constants from "../../common/constants.js";
import { escapeMessage } from "../../util/markdown.js";
import { nth } from "../../util/numbers.js";
import { gracefulFetch } from "../../util/promises.js";
import { fetchUser } from "../../util/scratch.js";
import { truncateText } from "../../util/text.js";

const EMBED_LENGTH = 750;

export function getMatches(content: string): URL[] {
	const scratchUrlRegex =
		/(?:^|.)?https?:\/\/scratch\.(?:mit\.edu|org|camp|love|pizza|team)\/(?:projects|users|studios|discuss)\/(?:[\w!#$&'()*+,./:;=?@~-]|%\d\d)+(?:$|.)?/gis; //gpt wrote the regex and like half of this code

	const urls = new Map<string, URL>();
	for (const match of content.match(scratchUrlRegex) ?? []) {
		const url = parseURL(match);
		if (url) urls.set(url.href, url);
	}
	return [...urls.values()];
}

export function parseURL(match: string): URL | undefined {
	if (match.startsWith("<") && match.endsWith(">")) return;

	const start = match.startsWith("http") ? 0 : 1,
		end = match.length - (/[\w!#$&'()*+,./:;=?@~-]$/.test(match) ? 0 : 1);

	return new URL(match.slice(start, end));
}

export async function handleMatch(url: URL): Promise<APIEmbed | undefined> {
	const urlParts = url.pathname.split("/");

	switch (urlParts[1]) {
		case "projects": {
			const embed = await handleProject(urlParts);
			if (embed) return embed;
			break;
		}
		case "users": {
			const embed = await handleUser(urlParts);
			if (embed) return embed;
			break;
		}
		case "studios": {
			const embed = await handleStudio(urlParts);
			if (embed) return embed;
			break;
		}
		case "discuss": {
			const embed = await handleForumPost(urlParts, url.hash);
			if (embed) return embed;
			break;
		}
		default: {
			break;
		}
	}
}
export async function handleProject(urlParts: string[]): Promise<APIEmbed | undefined> {
	const project = await gracefulFetch(`${constants.urls.scratchApi}/projects/${urlParts[2]}/`);
	if (!project || project.code) return;

	const parent =
		project.remix.parent &&
		(await gracefulFetch(`${constants.urls.scratchApi}/projects/${project.remix.parent}/`));

	const embed = {
		title: project.title,
		color: constants.scratchColor,

		fields: [
			{
				name: `${constants.emojis.scratch.love} ${project.stats.loves.toLocaleString()} ${
					constants.emojis.scratch.favorite
				} ${project.stats.favorites.toLocaleString()}`,
				value: `**${
					constants.emojis.scratch.remix
				} ${project.stats.remixes.toLocaleString()} ${
					constants.emojis.scratch.view
				} ${project.stats.views.toLocaleString()}**`,
				inline: true,
			},
		],
		thumbnail: { url: project.images["282x218"] },
		author: {
			name: project.author.username,
			url: `${constants.urls.scratch}/users/${project.author.username}`,
			icon_url: project.author.profile.images["90x90"],
		},
		url: `${constants.urls.scratch}/projects/${urlParts[2]}`,
		timestamp: new Date(project.history.shared).toISOString(),
	};

	if (parent) {
		embed.fields.push({
			name: "⬆️ Remix of",
			value: `[${parent.title}](${constants.urls.scratch}/projects/${project.remix.parent}/)`,
			inline: true,
		});
	}
	if (project.description) {
		embed.fields.unshift({
			name: "🫂 Notes and Credits",
			value: truncateText(linkifyMentions(project.description), EMBED_LENGTH / 2, true),
			inline: false,
		});
	}
	if (project.instructions) {
		embed.fields.unshift({
			name: "📜 Instructions",
			value: truncateText(linkifyMentions(project.instructions), EMBED_LENGTH / 2, true),
			inline: false,
		});
	}

	return embed;
}
export async function handleUser(urlParts: string[]): Promise<APIEmbed | undefined> {
	const user = urlParts[2] && (await fetchUser(urlParts[2]));
	if (!user) return;

	const embed = {
		title: `${user.username}${
			("status" in user ? user.status == "Scratch Team" : user.scratchteam) ? "*" : ""
		}`,
		color: constants.scratchColor,

		fields:
			"statistics" in user && user.statistics
				? [
						{
							name: `${constants.emojis.scratch.followers} Followers`,
							value: `${user.statistics.followers.toLocaleString()} (ranked ${nth(
								user.statistics.ranks.followers,
							)})`,
							inline: true,
						},
						{
							name: `${constants.emojis.scratch.following} Following`,
							value: user.statistics.following.toLocaleString(),
							inline: true,
						},
				  ]
				: [],
		thumbnail: { url: `https://uploads.scratch.mit.edu/get_image/user/${user.id}_90x90.png` },
		author: {
			name: `${"country" in user ? user.country : user.profile.country}${
				"status" in user && user.status == "New Scratcher"
					? `${constants.footerSeperator}${user.status}`
					: ""
			}`,
		},
		url: `${constants.urls.scratch}/users/${user.username}`,
		timestamp: new Date("joined" in user ? user.joined : user.history.joined).toISOString(),
	};

	if ("profile" in user ? user.profile.status : user.work) {
		embed.fields.unshift({
			// eslint-disable-next-line unicorn/string-content
			name: "🛠️ What I'm working on",
			value: truncateText(
				"profile" in user
					? linkifyMentions(user.profile.status)
					: htmlToMarkdown(user.work),
				EMBED_LENGTH / 2,
				true,
			),
			inline: false,
		});
	}
	if ("profile" in user ? user.profile.bio : user.bio) {
		embed.fields.unshift({
			name: "👋 About me",
			value: truncateText(
				"profile" in user ? linkifyMentions(user.profile.bio) : htmlToMarkdown(user.bio),
				EMBED_LENGTH / 2,
				true,
			),
			inline: false,
		});
	}

	return embed;
}
export async function handleStudio(urlParts: string[]): Promise<APIEmbed | undefined> {
	const studio = await gracefulFetch(`${constants.urls.scratchApi}/studios/${urlParts[2]}/`);
	if (!studio || studio.code) return;

	return {
		title: studio.title,
		description: truncateText(linkifyMentions(studio.description), EMBED_LENGTH, true),
		color: constants.scratchColor,

		fields: [
			{
				name: `${constants.emojis.scratch.followers} Followers`,
				value: studio.stats.followers,
				inline: true,
			},
			{
				name: `${constants.emojis.scratch.projects} Projects`,
				value: studio.stats.projects,
				inline: true,
			},
			{
				name: `${constants.emojis.scratch.comments} Comments`,
				value: studio.stats.comments + (studio.comments_allowed ? "" : " (off)"),
				inline: true,
			},
		],
		thumbnail: { url: studio.image },

		url: `${constants.urls.scratch}/studios/${urlParts[2]}`,
		timestamp: new Date(studio.history.created).toISOString(),
	};
}
export async function handleForumPost(
	urlParts: string[],
	hash: string,
): Promise<APIEmbed | undefined> {
	const type = urlParts[2] === "topic" && hash.startsWith("#post-") ? "post" : urlParts[2];
	const id = urlParts[2] === "topic" && type == "post" ? hash.split("-")[1] ?? "" : urlParts[3];

	const post =
		type === "post"
			? await gracefulFetch(`${constants.urls.scratchdb}/forum/post/info/${id}/`)
			: type === "topic" &&
			  (await gracefulFetch(
					`${constants.urls.scratchdb}/forum/topic/posts/${id}?o=oldest`,
			  ).then(([post]) => post));
	if (!post || post.error || post.deleted) return;

	const editedString = post.editor
		? `\n\n*Last edited by ${post.editor} (${time(
				new Date(post.time.edited),
				TimestampStyles.ShortDateTime,
		  )})*`
		: "";

	return {
		title: `${post.topic.closed ? "🔒 " : ""}${post.topic.title}${constants.footerSeperator}${
			post.topic.category
		}`,
		description: truncateText(
			htmlToMarkdown(post.content.html) + editedString,
			EMBED_LENGTH,
			true,
		),
		color: constants.scratchColor,
		author: { name: post.username, url: `${constants.urls.scratch}/users/${post.username}` },
		url: `${constants.urls.scratch}/discuss/topic/${post.topic.id}`,
		timestamp: new Date(post.time.posted).toISOString(),
	};
}

type NodeOrNodes = Node | NodeOrNodes[];
export function htmlToMarkdown(string: string): string {
	const nodes = parser(string, { decodeEntities: true, recognizeNoValueAttribute: true });
	return nodesToText(nodes);
}
function nodesToText(node: NodeOrNodes, shouldEscape = true): string {
	if (Array.isArray(node))
		return node.map((subnode) => nodesToText(subnode, shouldEscape)).join("");
	if (typeof node !== "object")
		return shouldEscape ? escapeMessage(node.toString()) : node.toString();

	const content =
		typeof node.content !== "number" && !node.content?.length ? "" : nodesToText(node.content);
	const unescaped = content && nodesToText(node.content ?? "", false);

	switch (node.tag) {
		case "br": {
			return "\n";
		}
		case "a": {
			return `[${content}](${new URL(
				node.attrs?.href?.toString() ?? "",
				constants.urls.scratch,
			).toString()})`;
		}
		case "span": {
			const output =
				typeof node.attrs?.class === "string" &&
				{
					"bb-bold": `**${content}**`,
					"bb-italic": `*${content}*`,
					"bb-underline": `__${content}__`,
					"bb-strikethrough": `~~${content}~~`,
					"bb-big": `**${content}**`, // can’t be a header, it might be inline
					"bb-small": unescaped.includes("`") ? content : `\`${unescaped}\``,
				}[node.attrs.class];
			if (output) return output;
			break;
		}
		case "img": {
			const url = new URL(node.attrs?.src?.toString() ?? "", constants.urls.scratch);
			return `[${
				content || node.attrs?.alt || url.pathname.split("/").at(-1)
			}](${url.toString()})`;
		}
		case "blockquote": {
			return `\n${content.trim().replaceAll(/^/gm, "> ")}\n`;
		}
		case "p": {
			if (node.attrs?.class !== "bb-quote-author") break;
			return `**${content}**\n`;
		}
		case "div": {
			if (node.attrs?.class !== "code") break;
			return `\`\`\`\n${cleanCodeBlockContent(unescaped)}\n\`\`\``;
		}
		case "pre": {
			if (node.attrs?.class !== "blocks") break;
			return `\`\`\`\n${cleanCodeBlockContent(unescaped)}\n\`\`\``;
		}
		case "li": {
			return `- ${content}`;
		}
		default: {
			return content;
		}
	}
	return content;
}

export function linkifyMentions(string: string): string {
	return escapeMessage(string).replaceAll(/@([\w\\-])+/g, (name) => {
		name = name.replaceAll("\\", "");
		return `[${name}](${constants.urls.scratch}/users/${name.slice(1)})`;
	});
}
