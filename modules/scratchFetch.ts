import { defineEvent } from "strife.js";
import { getSettings } from "./settings.js";
import constants from "../common/constants.js";

defineEvent("messageCreate", async (message) => {
	const notSet = getSettings(message.author, false)?.scratchEmbeds === undefined;
	if (!getSettings(message.author).scratchEmbeds) {
		return;
	}
	const scratchUrlRegex =
		/(?<!<)https?:\/\/scratch\.mit\.edu\/(projects|users|studios|discuss)\/[/-\w]+\/?(?!>)/; //gpt wrote the regex and like half of this code
	const match = message.content.match(scratchUrlRegex);

	if (!match) {
		return;
	}

	const urlParts = match[0].split("/");
	const type = urlParts[3];

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
	switch (type) {
		case "projects":
			const projectdata = await fetchApiData(
				`https://${constants.urls.scratchApi}/projects/${urlParts[4]}/`,
			).catch(() => {});

			message.reply({
				embeds: [
					{
						title: projectdata.title,
						description: `**desc**: ${projectdata.description}\n**inst**: ${projectdata.instructions}`,
						color: 0x885cd4,

						fields: [
							{
								name: `views`,
								value: projectdata.stats.views,
								inline: true,
							},
							{
								name: `loves`,
								value: projectdata.stats.loves,
								inline: true,
							},
							{
								name: `favorites`,
								value: projectdata.stats.favorites,
								inline: true,
							},
							{
								name: `remixes`,
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
					},
				],
				allowedMentions: { repliedUser: false },
			});

			break;
		case "users":
			const userdata = await fetchApiData(
				`https://${constants.urls.scratchApi}/users/${urlParts[4]}/`,
			).catch(() => {});

			message.reply({
				embeds: [
					{
						title: userdata.username,
						description: "",
						color: 0x885cd4,

						fields: [
							{
								name: `About`,
								value: userdata.profile.bio,
							},
							{
								name: `WIWO`,
								value: userdata.profile.status,
							},
						],
						thumbnail: {
							url: userdata.profile.images["90x90"],
						},
						author: {
							name: userdata.scratchteam ? "Scratch Team" : "",
						},
						footer: {
							text: notSet ? "Disable this using /settings" : "",
						},
						url: `https://scratch.mit.edu/users/${urlParts[4]}`,
					},
				],
				allowedMentions: { repliedUser: false },
			});

			break;
		case "studios":
			const studiodata = await fetchApiData(
				`https://${constants.urls.scratchApi}/studios/${urlParts[4]}/`,
			).catch(() => {});
			message.reply({
				embeds: [
					{
						title: studiodata.title,
						description: long(studiodata.description, 400, "..."),
						color: 0x885cd4,

						fields: [
							{
								name: `comments`,
								value: studiodata.comments_allowed
									? `${studiodata.stats.comments}`
									: `${studiodata.stats.comments} (off)`,
								inline: true,
							},
							{
								name: `followers`,
								value: studiodata.stats.followers,
								inline: true,
							},
							{
								name: `managers`,
								value: studiodata.stats.managers,
								inline: true,
							},
							{
								name: `projects`,
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
					},
				],
				allowedMentions: { repliedUser: false },
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
					message.reply({
						embeds: [
							{
								title: topicdata.title,
								description:
									topicfirst.content
										.bb /*`**In**: ${topicdata.category} ${topicdata.closed=0 ? "closed":""}`*/,

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
							},
						],
						allowedMentions: { repliedUser: false },
					});

					break;
				case "post":
					const postdata = await fetchApiData(
						`https://scratchdb.lefty.one/v3/forum/post/info/${urlParts[5]}/`,
					).catch(() => {});
					message.reply({
						embeds: [
							{
								title: postdata.title,
								description: postdata.content.bb,
								color: 0x885cd4,

								footer: {
									text: notSet ? "Disable this using /settings" : "",
								},
								author: {
									name: postdata.username,
									url: `https://scratch.mit.edu/users/${postdata.username}`,
								},
								url: `https://scratch.mit.edu/discuss/post/${urlParts[5]}`,
							},
						],
						allowedMentions: { repliedUser: false },
					});
					break;
				default:
					break;
			}
			break;
	}
});
