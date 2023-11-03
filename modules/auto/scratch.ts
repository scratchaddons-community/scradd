/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// TODO: actually type this

import { getSettings } from "../settings.js";
import constants from "../../common/constants.js";
import { truncateText } from "../../util/text.js";
import { nth } from "../../util/numbers.js";
import { time, type APIEmbed, TimestampStyles, Message, cleanCodeBlockContent } from "discord.js";
import { gracefulFetch } from "../../util/promises.js";
import { escapeMessage } from "../../util/markdown.js";
import { parser, type Node } from "posthtml-parser";

const EMBED_LENGTH = 750;

export default async function scratch(message: Message) {
	if (!(await getSettings(message.author)).scratchEmbeds) return false;
	const notSet = (await getSettings(message.author, false)).scratchEmbeds === undefined;

	const scratchUrlRegex =
		/(?:^|.)?https?:\/\/scratch\.(?:mit\.edu|org)\/(?:projects|users|studios|discuss)\/(?:[\w!#$&'()*+,./:;=?@~-]|%\d\d)+(?:$|.)?/gis; //gpt wrote the regex and like half of this code
	const matches = [...new Set(message.content.match(scratchUrlRegex))].slice(0, 5);

	const embeds: APIEmbed[] = [];

	for (const match of matches) {
		if (match.startsWith("<") && match.endsWith(">")) continue;

		const start = match.startsWith("http") ? 0 : 1,
			end = match.length - (/[\w!#$&'()*+,./:;=?@~-]$/.test(match) ? 0 : 1);
		const urlParts =
			match
				.slice(start, end)
				.replace(
					/https?:\/\/scratch\.(?:mit\.edu|org)\/discuss\/topic\/\d+(?:\?page=\d+)?#post-/,
					constants.urls.scratch + "/discuss/post/",
				)
				.split("#")[0]
				?.split("?")[0]
				?.split("/") ?? [];

		switch (urlParts[3]) {
			case "projects": {
				const project = await gracefulFetch(
					`${constants.urls.scratchApi}/projects/${urlParts[4]}/`,
				);
				if (!project || project.code) continue;

				const parent =
					project.remix.parent &&
					(await gracefulFetch(
						`${constants.urls.scratchApi}/projects/${project.remix.parent}/`,
					));

				const embed = {
					title: project.title,
					color: constants.scratchColor,

					fields: [
						{
							name: `${
								constants.emojis.scratch.love
							}${project.stats.loves.toLocaleString()} ${
								constants.emojis.scratch.favorite
							}${project.stats.favorites.toLocaleString()}`,
							value: `**${
								constants.emojis.scratch.remix
							}${project.stats.remixes.toLocaleString()} ${
								constants.emojis.scratch.view
							}${project.stats.views.toLocaleString()}**`,
							inline: true,
						},
					],
					thumbnail: { url: project.images["282x218"] },
					author: {
						name: project.author.username,
						url: `${constants.urls.scratch}/users/${project.author.username}`,
						icon_url: project.author.profile.images["90x90"],
					},
					footer: notSet ? { text: "Disable this using /settings" } : undefined,
					url: `${constants.urls.scratch}/projects/${urlParts[4]}`,
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
						value: truncateText(
							linkifyMentions(project.description),
							EMBED_LENGTH / 2,
							true,
						),
						inline: false,
					});
				}
				if (project.instructions) {
					embed.fields.unshift({
						name: "📜 Instructions",
						value: truncateText(
							linkifyMentions(project.instructions),
							EMBED_LENGTH / 2,
							true,
						),
						inline: false,
					});
				}

				embeds.push(embed);
				break;
			}
			case "users": {
				const user = await gracefulFetch(
					`${constants.urls.scratchdb}/user/info/${urlParts[4]}/`,
				);
				if (!user || user.error) continue;

				const embed = {
					title: `${user.username}${user.status == "Scratch Team" ? "*" : ""}`,
					color: constants.scratchColor,

					fields: user.statistics
						? [
								{
									name: `${constants.emojis.scratch.followers} Followers`,
									value: `${user.statistics.followers.toLocaleString()} (ranked ${nth(
										user.statistics.ranks.followers,
									)})`,
									inline: true,
								},
								{
									name: `${constants.emojis.scratch.following.toLocaleString()} Following`,
									value: user.statistics.following,
									inline: true,
								},
						  ]
						: [],
					thumbnail: {
						url: `https://cdn2.scratch.mit.edu/get_image/user/${user.id}_90x90.png`,
					},
					author: {
						name: `${user.country}${
							user.status == "New Scratcher"
								? `${constants.footerSeperator}${user.status}`
								: ""
						}`,
					},
					footer: notSet ? { text: "Disable this using /settings" } : undefined,
					url: `${constants.urls.scratch}/users/${urlParts[4]}`,
					timestamp: new Date(user.joined).toISOString(),
				};

				if (user.work) {
					embed.fields.unshift({
						// eslint-disable-next-line unicorn/string-content
						name: "🛠️ What I'm working on",
						value: truncateText(htmlToMarkdown(user.work), EMBED_LENGTH / 2, true),
						inline: false,
					});
				}
				if (user.bio) {
					embed.fields.unshift({
						name: "👋 About me",
						value: truncateText(htmlToMarkdown(user.bio), EMBED_LENGTH / 2, true),
						inline: false,
					});
				}

				embeds.push(embed);
				break;
			}
			case "studios": {
				const studio = await gracefulFetch(
					`${constants.urls.scratchApi}/studios/${urlParts[4]}/`,
				);
				if (!studio || studio.code) continue;

				embeds.push({
					title: studio.title,
					description: truncateText(
						linkifyMentions(studio.description),
						EMBED_LENGTH,
						true,
					),
					color: constants.scratchColor,

					fields: [
						{
							name: `${constants.emojis.scratch.followers.toLocaleString()} Followers`,
							value: studio.stats.followers,
							inline: true,
						},
						{
							name: `${constants.emojis.scratch.projects.toLocaleString()} Projects`,
							value: studio.stats.projects,
							inline: true,
						},
						{
							name: `${constants.emojis.scratch.comments.toLocaleString()} Comments`,
							value:
								studio.stats.comments + (studio.comments_allowed ? "" : " (off)"),
							inline: true,
						},
					],
					thumbnail: { url: studio.image },

					footer: notSet ? { text: "Disable this using /settings" } : undefined,
					url: `${constants.urls.scratch}/studios/${urlParts[4]}`,
					timestamp: new Date(studio.history.created).toISOString(),
				});
				break;
			}
			case "discuss": {
				const post =
					urlParts[4] === "post"
						? await gracefulFetch(
								`${constants.urls.scratchdb}/forum/post/info/${urlParts[5]}/`,
						  )
						: urlParts[4] === "topic" &&
						  (
								await gracefulFetch(
									`${constants.urls.scratchdb}/forum/topic/posts/${urlParts[5]}?o=oldest`,
								)
						  )?.[0];
				if (!post || post.error || post.deleted) continue;

				const editedString = post.editor
					? `\n\n*Last edited by ${post.editor} (${time(
							new Date(post.time.edited),
							TimestampStyles.ShortDateTime,
					  )})*`
					: "";

				embeds.push({
					title: `${post.topic.closed ? "🔒 " : ""}${post.topic.title}${
						constants.footerSeperator
					}${post.topic.category}`,
					description: truncateText(
						htmlToMarkdown(post.content.html) + editedString,
						EMBED_LENGTH,
						true,
					),
					color: constants.scratchColor,
					footer: notSet ? { text: "Disable this using /settings" } : undefined,
					author: {
						name: post.username,
						url: `${constants.urls.scratch}/users/${post.username}`,
					},
					url: `${constants.urls.scratch}/discuss/topic/${urlParts[5]}`,
					timestamp: new Date(post.time.posted).toISOString(),
				});
			}
		}
	}

	return embeds.length ? embeds : false;
}

function linkifyMentions(string: string) {
	return escapeMessage(string).replaceAll(/@([\w\\-])+/g, (name) => {
		name = name.replaceAll("\\", "");
		return `[${name}](${constants.urls.scratch}/users/${name})`;
	});
}

function htmlToMarkdown(string: string) {
	const nodes = parser(string, { decodeEntities: true, recognizeNoValueAttribute: true });
	return nodesToText(nodes);
}

type Nodes = Node | Nodes[];
function nodesToText(node: Nodes, escape = true): string {
	if (Array.isArray(node)) return node.map((node) => nodesToText(node, escape)).join("");
	if (typeof node !== "object") return escape ? escapeMessage(node.toString()) : node.toString();

	const content =
		typeof node.content !== "number" && !node.content?.length ? "" : nodesToText(node.content);
	const unescaped = content && nodesToText(node.content ?? "", false);

	switch (node.tag) {
		case "br": {
			return "\n";
		}
		case "a": {
			const url = new URL(node.attrs?.href?.toString() ?? "", constants.urls.scratch);
			return `[${content}](${url})`;
		}
		case "span": {
			const output =
				typeof node.attrs?.class === "string" &&
				{
					"bb-bold": `**${content}**`,
					"bb-italic": `*${content}*`,
					"bb-underline": `__${content}__`,
					"bb-strikethrough": `~~${content}~~`,
					"bb-big": `**${content}**`,
					// eslint-disable-next-line unicorn/string-content
					"bb-small": `\`${unescaped.replaceAll("`", "'")}\``,
				}[node.attrs.class];
			if (output) return output;
			break;
		}
		case "img": {
			const url = new URL(node.attrs?.src?.toString() ?? "", constants.urls.scratch);
			return `[${content || node.attrs?.alt || url.pathname.split("/").at(-1)}](${url})`;
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
			// todo: ordered lists
		}
	}

	return content;
}
