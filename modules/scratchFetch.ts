import { defineEvent } from "strife.js";
import { getSettings } from "./settings.js";
import constants from "../common/constants.js";

defineEvent("messageCreate", async (message) => {
	const notSet = getSettings(message.author, false)?.scratchEmbeds === undefined;
	if (!getSettings(message.author).scratchEmbeds) {
		return;
	}
	const scratchUrlRegex =
		/(?<!<)https?:\/\/scratch\.mit\.edu\/(projects|users|studios|discuss)\/[?=/-\w]+\/?(?!>)/gi; //gpt wrote the regex and like half of this code
	const matches = message.content.match(scratchUrlRegex);

	if (!matches) {
		return;
	}
	const match = matches.slice(0, 3);

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

	let msgEmbeds = [];
	message.channel.send(`${match}`);
	for (let i of match) {
		const urlParts = i.split("/");

		const type = urlParts[3];

		switch (type) {
			case "projects":
				const projectdata = await fetchApiData(
					`${constants.urls.scratchApi}/projects/${urlParts[4]}/`,
				).catch(() => {});

				msgEmbeds.push({
					title: projectdata.title,
					description: `**desc**: ${projectdata.description}\n**inst**: ${projectdata.instructions}`,
					color: 0x885cd4,

					fields: [
						{
							name: `<:view:1151842294287306832>Views`,
							value: projectdata.stats.views,
							inline: true,
						},
						{
							name: `<:heart:1151842300033519667>Loves`,
							value: projectdata.stats.loves,
						},
						{
							name: `<:fav:1151842297340776488>Favs`,
							value: projectdata.stats.favorites,
						},
						{
							name: `<:remix:1151842289635827842>Remixes`,
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
					`${constants.urls.scratchApi}/users/${urlParts[4]}/`,
				).catch(() => {});

				msgEmbeds.push({
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
				});

				break;
			case "studios":
				const studiodata = await fetchApiData(
					`${constants.urls.scratchApi}/studios/${urlParts[4]}/`,
				).catch(() => {});
				msgEmbeds.push({
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
							color: 0x885cd4,

							footer: {
								text: notSet ? "Disable this using /settings" : "",
							},
							author: {
								name: postdata.username,
								url: `https://scratch.mit.edu/users/${postdata.username}`,
							},
							url: `https://scratch.mit.edu/discuss/post/${urlParts[5]}`,
						});
						break;
					default:
						break;
				}
				break;
		}
	}
	message.reply({
		embeds: msgEmbeds,
		allowedMentions: { repliedUser: false },
	});
});
