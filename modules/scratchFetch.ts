import { defineEvent } from "strife.js";
import { getSettings } from "./settings.js";

defineEvent("messageCreate", async (message) => {
	const notSet = getSettings(message.author, false)?.scratchEmbeds === undefined;
	if (!getSettings(message.author).scratchEmbeds) {
		return;
	}
	const scratchUrlRegex =
		/(?<!<)https?:\/\/scratch\.mit\.edu\/(projects|users|studios)\/\w+\/?(?!>)/; //gpt wrote the regex and like half of this code
	const match = message.content.match(scratchUrlRegex);

	if (!match) {
		return;
	}

	const urlParts = match[0].split("/");
	const type = urlParts[3]; // m ybrain is dead

	async function fetchApiData(apiUrl: string): Promise<any>{
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

	if (type === "projects") {
		const projectId = urlParts[4];

		const apiUrl = `https://api.scratch.mit.edu/projects/${projectId}/`;

		fetchApiData(apiUrl)
			.then((data) => {
				//I hate hate hate hate this aaaaa

				message.channel.send({
					embeds: [
						{
							title: data.title,
							description: `**desc**: ${data.description}\n**inst**: ${data.instructions}`,
							
							fields: [
								{
									name: `views`,
									value: data.stats.views,
									inline: true,
								},
								{
									name: `loves`,
									value: data.stats.loves,
									inline: true,
								},
								{
									name: `favorites`,
									value: data.stats.favorites,
									inline: true,
								},
								{
									name: `remixes`,
									value: data.stats.remixes,
									inline: true,
								},
							],
							
							thumbnail: {
								url: data.images["282x218"],
							},
							author: { 	
								name: data.author.username,
								url: `https://scratch.mit.edu/users/${data.author.username}`,
								icon_url: data.author.profile.images["90x90"],
							},
							footer: {
								text: notSet ? "Disable this using /settings" : "",
								
							},
							url: `https://scratch.mit.edu/projects/${projectId}`,
						},
					],
				});
			})
			.catch(() => {
				//AKJGFDJHGADJHGJHADGJHGBDJKWD WHYYYYYYYYYYYYYYYYYYYYYY
			});
	} else if (type === "users") {
		const username = urlParts[4];

		const apiUrl = `https://api.scratch.mit.edu/users/${username}/`;

		fetchApiData(apiUrl)
			.then((data) => {
				message.channel.send({
					embeds: [
						{
							title: data.username,
							description: ``,
							
							fields: [
								{
									name: `About`,
									value: data.profile.bio,
									
								},
								{
									name: `WIWO`,
									value: data.profile.status,
									
								},
								
							],
							
							thumbnail: {
								url: data.profile.images["90x90"],
								
							},
							author: {
								name: data.scratchteam ? "Scratch Team" : "",
							},
							footer: {
								text: notSet ? "Disable this using /settings" : "",
								
							},
							url: `https://scratch.mit.edu/users/${username}`,
						},
					],
				});
			})
			.catch(() => {});
	} else if (type === "studios") {
		const studioId = urlParts[4];

		const apiUrl = `https://api.scratch.mit.edu/studios/${studioId}/`;

		fetchApiData(apiUrl)
			.then((data) => {
				//mnm,nmnm,nn/m.n.,nmn/mn

				message.channel.send({
					embeds: [
						{
							title: data.title,
							description: long(data.description, 400, "..."),
							
							fields: [
								{
									name: `comments`,
									value: data.comments_allowed
										? `${data.stats.comments}`
										: `${data.stats.comments} (off)`,
									inline: true,
								},
								{
									name: `followers`,
									value: data.stats.followers,
									inline: true,
								},
								{
									name: `managers`,
									value: data.stats.managers,
									inline: true,
								},
								{
									name: `projects`,
									value: data.stats.projects,
									inline: true,
								},
							],
							
							thumbnail: {
								url: data.image,
								
							},
							footer: {
								text: notSet ? "Disable this using /settings" : "",
								icon_url: ``,
							},
							url: `https://scratch.mit.edu/studios/${studioId}`,
						},
					],
				});
			})
			.catch(() => {
				//babeh shark
			});
	} else {
	}
});
