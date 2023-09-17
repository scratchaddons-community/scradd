/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { defineEvent } from "strife.js";
import { getSettings } from "./settings.js";
import constants from "../common/constants.js";
import { truncateText } from "../util/text.js";
import { nth } from "../util/numbers.js";
import type { APIEmbed } from "discord.js";
import { gracefulFetch } from "../util/promises.js";

defineEvent("messageCreate", async (message) => {
	const notSet = getSettings(message.author, false).scratchEmbeds === undefined;
	if (!getSettings(message.author).scratchEmbeds) {
		return;
	}
	const scratchUrlRegex =
		/(?<!<)https?:\/\/scratch\.mit\.edu\/(projects|users|studios|discuss)\/[/-\w]+\/?(?!>)/gi; //gpt wrote the regex and like half of this code
	const matches = [...new Set(message.content.match(scratchUrlRegex))].slice(0, 5);

	const embeds: APIEmbed[] = [];

	for (const match of matches) {
		const urlParts = match.split("/");

		switch (urlParts[3]) {
			case "projects": {
				const project = await gracefulFetch(
					`${constants.urls.scratchApi}/projects/${urlParts[4]}/`,
				);
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
							name: `${constants.emojis.scratch.love} Loves`,
							value: project.stats.loves,
							inline: true,
						},
						{
							name: `${constants.emojis.scratch.favorite} Favorites`,
							value: project.stats.favorites,
							inline: true,
						},
						{
							name: constants.zeroWidthSpace,
							value: constants.zeroWidthSpace,
							inline: true,
						}, // spacer for a 2x2 grid of stats
						{
							name: `${constants.emojis.scratch.remix} Remixes`,
							value: project.stats.remixes,
							inline: true,
						},
						{
							name: `${constants.emojis.scratch.view} Views`,
							value: project.stats.views,
							inline: true,
						},
					],
					thumbnail: {
						url: project.images["282x218"],
					},
					author: {
						name: `${project.author.username}${
							parent ? `${constants.footerSeperator}Remix of ${parent.title}` : ""
						}`,
						url: `https://scratch.mit.edu/users/${project.author.username}`,
						icon_url: project.author.profile.images["90x90"],
					},
					footer: notSet ? { text: "Disable this using /settings" } : undefined,
					url: `https://scratch.mit.edu/projects/${urlParts[4]}`,
					timestamp: new Date(project.history.shared).toISOString(),
				};

				if (project.description) {
					embed.fields.unshift({
						name: "Notes and Credits",
						value: truncateText(project.description, 1024, true),
						inline: false,
					});
				}
				if (project.instructions) {
					embed.fields.unshift({
						name: "Instructions",
						value: truncateText(project.instructions, 1024, true),
						inline: false,
					});
				}

				embeds.push(embed);
				break;
			}
			case "users": {
				const user = await gracefulFetch(
					`https://scratchdb.lefty.one/v3/user/info/${urlParts[4]}/`,
				);

				const embed = {
					title: `${user.username}${user.status == "Scratch Team" ? "*" : ""}`,
					color: constants.scratchColor,

					fields: [
						{
							name: `${constants.emojis.scratch.followers} Followers`,
							value:
								user.statistics.followers +
								` (ranked ${nth(user.statistics.ranks.followers)})`,
							inline: true,
						},
						{
							name: `${constants.emojis.scratch.following} Following`,
							value: user.statistics.following,
							inline: true,
						},
					],
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
					url: `https://scratch.mit.edu/users/${urlParts[4]}`,
					timestamp: new Date(user.joined).toISOString(),
				};

				if (user.work) {
					embed.fields.unshift({
						// eslint-disable-next-line unicorn/string-content
						name: "What I'm working on",
						value: truncateText(user.work, 1024, true),
						inline: false,
					});
				}
				if (user.bio) {
					embed.fields.unshift({
						name: "About me",
						value: truncateText(user.bio, 1024, true),
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
				embeds.push({
					title: studio.title,
					description: truncateText(studio.description, 4096, true),
					color: constants.scratchColor,

					fields: [
						{
							name: `${constants.emojis.scratch.comments} Comments`,
							value:
								studio.stats.comments + (studio.comments_allowed ? "" : " (off)"),
							inline: true,
						},
						{
							name: `${constants.emojis.scratch.followers} Followers`,
							value: studio.stats.followers,
							inline: true,
						},
						{
							name: `${constants.emojis.scratch.managers} Managers`,
							value: studio.stats.managers,
							inline: true,
						},
						{
							name: `${constants.emojis.scratch.projects} Projects`,
							value: studio.stats.projects,
							inline: true,
						},
					],
					thumbnail: { url: studio.image },

					footer: notSet ? { text: "Disable this using /settings" } : undefined,
					url: `https://scratch.mit.edu/studios/${urlParts[4]}`,
					timestamp: new Date(studio.history.created).toISOString(),
				});
				break;
			}
			case "discuss": {
				const post =
					urlParts[4] === "post"
						? await gracefulFetch(
								`https://scratchdb.lefty.one/v3/forum/post/info/${urlParts[5]}/`,
						  )
						: (
								await gracefulFetch(
									`https://scratchdb.lefty.one/v3/forum/topic/posts/${urlParts[5]}?o=oldest`,
								)
						  )[0];

				const embed = {
					title: post.topic.title,
					description: truncateText(post.content.html, 4096, true),
					color: constants.scratchColor,

					fields: [{ name: "Category", value: post.topic.category, inline: true }],
					footer: notSet ? { text: "Disable this using /settings" } : undefined,
					author: {
						name: post.username,
						url: `https://scratch.mit.edu/users/${post.username}`,
					},
					url: `https://scratch.mit.edu/discuss/topic/${urlParts[5]}`,
					timestamp: new Date(post.time.posted).toISOString(),
				};
				if (post.topic.closed) {
					embed.fields.push({ name: "Closed?", value: "Yes", inline: true });
				}

				embeds.push(embed);

				break;
			}
		}
	}

	if (embeds.length) await message.reply({ embeds });
});
