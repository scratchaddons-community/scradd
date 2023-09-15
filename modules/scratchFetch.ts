import { defineEvent } from "strife.js";
import { getSettings } from "./settings.js";
import constants from "../common/constants.js";

async function fetchApiData(apiUrl: string): Promise<any> {
	try {
		const response = await fetch(apiUrl);

		const data = await response.json();
		return data;
	} catch (error) {}
}
function long(text: string, maxLength: number, appendText: string): string {
	if (text.length > maxLength) {
		return text.substr(0, maxLength) + appendText;
	}
	return text;
}
function getOrdinal(i: number) {
	var j = i % 10,
		k = i % 100;
	if (j == 1 && k != 11) {
		return i + "st";
	}
	if (j == 2 && k != 12) {
		return i + "nd";
	}
	if (j == 3 && k != 13) {
		return i + "rd";
	}
	return i + "th";
}
function FindDupes(arr: Array<any>) {
	return arr.filter((item, index) => arr.indexOf(item) === index);
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

	const match = FindDupes(matches).slice(0, 5);
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

					msgEmbeds.push({
						title: projectdata.title,
						description: `**desc**: ${projectdata.description}\n**inst**: ${projectdata.instructions}`,
						color: constants.scratchColor,

						fields: [
							{
								name: `${constants.emojis.scratch.view}Views`,
								value: projectdata.stats.views,
								inline: true,
							},
							{
								name: `${constants.emojis.scratch.love}Loves`,
								value: projectdata.stats.loves,
								inline: true,
							},
							{
								name: constants.zeroWidthSpace,
								value: constants.zeroWidthSpace,
							}, // spacer for a 2x2 grid of stats

							{
								name: `${constants.emojis.scratch.fav}Favs`,
								value: projectdata.stats.favorites,
								inline: true,
							},
							{
								name: `${constants.emojis.scratch.remix}Remixes`,
								value: projectdata.stats.remixes,
								inline: true,
							},
						],
						thumbnail: {
							url: projectdata.images["282x218"],
						},
						author: {
							name: projectdata.author.username,
							url: `https://scratch.mit.edu/users/${projectdata.author.username}`,
							icon_url: projectdata.author.profile.images["90x90"],
						},
						footer: {
							text: notSet ? "Disable this using /settings" : "",
						},
						url: `https://scratch.mit.edu/projects/${urlParts[4]}`,
					});

					break;
				case "users":
					const userdata = await fetchApiData(
						`https://scratchdb.lefty.one/v3/user/info/${urlParts[4]}/`,
					).catch(() => {});

					msgEmbeds.push({
						title: `${userdata.username}${
							userdata.status == "Scratch Team" ? "*" : ""
						}`,
						description: `follows: ${getOrdinal(
							userdata.statistics.ranks.country.followers,
						)} in ${userdata.country}, ${getOrdinal(
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
								name: `${constants.emojis.scratch.followers}Followers`,
								value: userdata.statistics.followers,
								inline: true,
							},
							{
								name: `${constants.emojis.scratch.following}Following`,
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
					});

					break;
				case "studios":
					const studiodata = await fetchApiData(
						`${constants.urls.scratchApi}/studios/${urlParts[4]}/`,
					).catch(() => {});
					msgEmbeds.push({
						title: studiodata.title,
						description: long(studiodata.description, 400, "..."),
						color: constants.scratchColor,

						fields: [
							{
								name: `${constants.emojis.scratch.comments}comments`,
								value: studiodata.comments_allowed
									? `${studiodata.stats.comments}`
									: `${studiodata.stats.comments} (off)`,
								inline: true,
							},
							{
								name: `${constants.emojis.scratch.followers}followers`,
								value: studiodata.stats.followers,
								inline: true,
							},
							{
								name: `${constants.emojis.scratch.managers}managers`,
								value: studiodata.stats.managers,
								inline: true,
							},
							{
								name: `${constants.emojis.scratch.projects}projects`,
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
					});
					break;
				case "discuss":
					switch (urlParts[4]) {
						case "topic":
							const topicdata = await fetchApiData(
								`https://scratchdb.lefty.one/v3/forum/topic/info/${urlParts[5]}/`,
							).catch(() => {});
							const topicposts = await fetchApiData(
								`https://scratchdb.lefty.one/v3/forum/topic/posts/${urlParts[5]}/`,
							).catch(() => {});
							const topicfirst = topicposts[0];
							msgEmbeds.push({
								title: topicdata.title,
								description: topicfirst.content.bb`**In**: ${
									topicdata.category
								} ${(topicdata.closed = 0 ? "closed" : "")}`,

								fields: [
									{
										name: "posts",
										value: topicdata.post_count,
									},
								],
								footer: {
									text: notSet ? "Disable this using /settings" : "",
								},
								author: {
									name: topicfirst.username,
									url: `https://scratch.mit.edu/users/${topicfirst.username}`,
								},
								url: `https://scratch.mit.edu/discuss/topic/${urlParts[5]}`,
							});

							break;
						case "post":
							const postdata = await fetchApiData(
								`https://scratchdb.lefty.one/v3/forum/post/info/${urlParts[5]}/`,
							).catch(() => {});
							msgEmbeds.push({
								title: postdata.title,
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
							});
					}
			}
		} catch {}
	}

	if (msgEmbeds.length != 0) {
		message.reply({
			embeds: msgEmbeds,
			allowedMentions: { repliedUser: false },
		});
	}
});
