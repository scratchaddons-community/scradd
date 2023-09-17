import { defineEvent } from "strife.js";
import { getSettings } from "./settings.js";
import constants from "../common/constants.js";
import { truncateText } from "../util/text.js";
import { nth } from "../util/numbers.js";
async function fetchApiData(apiUrl: string): Promise<any> {
	try {
		const response = await fetch(apiUrl);

		const data = await response.json();
		return data;
	} catch (error) {}
}

defineEvent("messageCreate", async (message) => {
	const notSet = getSettings(message.author, false)?.scratchEmbeds === undefined;
	if (!getSettings(message.author).scratchEmbeds) {
		return;
	}
	const scratchUrlRegex =
		/(?<!<)https?:\/\/scratch\.mit\.edu\/(projects|users|studios|discuss)\/[/-\w]+\/?(?!>)/gi; //gpt wrote the regex and like half of this code
	const matches = message.content.match(scratchUrlRegex);

	if (!matches) {
		return;
	}

	const match = [...new Set(matches)].slice(0, 5);
	let msgEmbeds = [];

	for (let i of match) {
		const urlParts = i.split("/");

		const type = urlParts[3];
		try {
			switch (type) {
				case "projects":
					const projectdata = await fetchApiData(
						`${constants.urls.scratchApi}/projects/${urlParts[4]}/`,
					).catch(() => {});
					let parentdata = null;
					if (projectdata.remix.parent != null) {
						parentdata = await fetchApiData(
							`${constants.urls.scratchApi}/projects/${projectdata.remix.parent}/`,
						);
					}

					let embed = {
						title: projectdata.title,
						description: ``,
						color: constants.scratchColor,

						fields: [
							{
								name: `${constants.emojis.scratch.love} Loves`,
								value: projectdata.stats.loves,
								inline: true,
							},
							{
								name: `${constants.emojis.scratch.fav} Favs`,
								value: projectdata.stats.favorites,
								inline: true,
							},
							{
								name: constants.zeroWidthSpace,
								value: constants.zeroWidthSpace,
							}, // spacer for a 2x2 grid of stats
							{
								name: `${constants.emojis.scratch.remix} Remixes`,
								value: projectdata.stats.remixes,
								inline: true,
							},
							{
								name: `${constants.emojis.scratch.view} Views`,
								value: projectdata.stats.views,
								inline: true,
							},
						],
						thumbnail: {
							url: projectdata.images["282x218"],
						},
						author: {
							name: `${projectdata.author.username} ${
								projectdata.remix.parent != null
									? `${constants.footerSeperator}Remix of ${parentdata.title}`
									: ``
							}`,
							url: `https://scratch.mit.edu/users/${projectdata.author.username}`,
							icon_url: projectdata.author.profile.images["90x90"],
						},
						footer: {
							text: notSet ? "Disable this using /settings" : "",
						},
						url: `https://scratch.mit.edu/projects/${urlParts[4]}`,
						timestamp: new Date(projectdata.history.shared).toISOString(),
					};

					if (projectdata.instructions != "") {
						embed.fields.unshift({
							name: `Instructions`,
							value: truncateText(projectdata.instructions, 10000),
							inline: false,
						});
					}
					if (projectdata.description != "") {
						embed.fields.unshift({
							name: `Notes and Credits`,
							value: truncateText(projectdata.description, 10000),
							inline: false,
						});
					}

					msgEmbeds.push(embed);

					break;
				case "users":
					const userdata = await fetchApiData(
						`https://scratchdb.lefty.one/v3/user/info/${urlParts[4]}/`,
					).catch(() => {});

					msgEmbeds.push({
						title: `${userdata.username}${
							userdata.status == "Scratch Team" ? "*" : ""
						}`,
						description: `follows: ${nth(
							userdata.statistics.ranks.country.followers,
						)} in ${userdata.country}, ${nth(
							userdata.statistics.ranks.followers,
						)} in World`,
						color: constants.scratchColor,

						fields: [
							{
								name: `About`,
								value: userdata.bio,
							},
							{
								name: `WIWO`,
								value: userdata.work,
							},
							{
								name: `${constants.emojis.scratch.followers} Followers`,
								value: userdata.statistics.followers,
								inline: true,
							},
							{
								name: `${constants.emojis.scratch.following} Following`,
								value: userdata.statistics.following,
								inline: true,
							},
						],
						thumbnail: {
							url: `https://cdn2.scratch.mit.edu/get_image/user/${userdata.id}_90x90.png`,
						},
						author: {
							name: `${userdata.country}${
								userdata.status == "New Scratcher"
									? `${constants.footerSeperator}New Scratcher`
									: ""
							}`,
						},
						footer: {
							text: notSet ? "Disable this using /settings" : "",
						},
						url: `https://scratch.mit.edu/users/${urlParts[4]}`,
						timestamp: new Date(userdata.joined).toISOString(),
					});

					break;
				case "studios":
					const studiodata = await fetchApiData(
						`${constants.urls.scratchApi}/studios/${urlParts[4]}/`,
					).catch(() => {});
					msgEmbeds.push({
						title: studiodata.title,
						description: truncateText(studiodata.description, 400),
						color: constants.scratchColor,

						fields: [
							{
								name: `${constants.emojis.scratch.comments} Comments`,
								value: studiodata.comments_allowed
									? `${studiodata.stats.comments}`
									: `${studiodata.stats.comments} (off)`,
								inline: true,
							},
							{
								name: `${constants.emojis.scratch.followers} Followers`,
								value: studiodata.stats.followers,
								inline: true,
							},
							{
								name: `${constants.emojis.scratch.managers} Managers`,
								value: studiodata.stats.managers,
								inline: true,
							},
							{
								name: `${constants.emojis.scratch.projects} Projects`,
								value: studiodata.stats.projects,
								inline: true,
							},
						],
						thumbnail: {
							url: studiodata.image,
						},

						footer: {
							text: notSet ? "Disable this using /settings" : "",
						},
						url: `https://scratch.mit.edu/studios/${urlParts[4]}`,
						timestamp: new Date(studiodata.history.created).toISOString(),
					});
					break;
				case "discuss":
					switch (urlParts[4]) {
						case "topic":
							const posts = await fetchApiData(
								`https://scratchdb.lefty.one/v3/forum/topic/posts/${urlParts[5]}?o=oldest`,
							).catch(() => {});
						
							const post = posts[0];
							const topicdata = post.topic;
							let embed = {
								title: `${topicdata.title}`,
								description: ` ${post.content.bb}`,
								color: constants.scratchColor,

								fields: [
									{
										name: "Catagory",
										value: topicdata.category,
									},
								],
								footer: {
									text: notSet ? "Disable this using /settings" : "",
								},
								author: {
									name: post.username,
									url: `https://scratch.mit.edu/users/${post.username}`,
								},
								url: `https://scratch.mit.edu/discuss/topic/${urlParts[5]}`,
								timestamp: new Date(post.time.posted).toISOString(),
							};
							if (topicdata.closed == "1") {
								embed.fields.unshift({
									name: `Closed`,
									value: constants.zeroWidthSpace,
								});
							}
						
							msgEmbeds.push(embed);

							break;
						case "post":
							const postdata = await fetchApiData(
								`https://scratchdb.lefty.one/v3/forum/post/info/${urlParts[5]}/`,
							).catch(() => {});
							msgEmbeds.push({
								title: postdata.topic.title,
								description: postdata.content.bb,
								color: constants.scratchColor,

								footer: {
									text: notSet ? "Disable this using /settings" : "",
								},
								author: {
									name: postdata.username,
									url: `https://scratch.mit.edu/users/${postdata.username}`,
								},
								url: `https://scratch.mit.edu/discuss/post/${urlParts[5]}`,
								timestamp: new Date(postdata.time.posted).toISOString(),
							});
					}
			}
		} catch (error) {
			message.reply(`${error}`);
		}
	}

	if (msgEmbeds.length != 0) {
		message.reply({
			embeds: msgEmbeds,
			allowedMentions: { repliedUser: false },
		});
	}
});
