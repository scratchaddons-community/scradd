import { ApplicationCommandOptionType, escapeMarkdown, hyperlink } from "discord.js";
import Fuse from "fuse.js";
import CONSTANTS from "../common/CONSTANTS.js";
import { manifest, addons } from "../common/extension.js";

import { escapeMessage, escapeLinks, generateTooltip } from "../util/markdown.js";
import { joinWithAnd } from "../util/text.js";
import { defineCommand } from "../common/types/command.js";

const fuse = new Fuse(addons, {
	findAllMatches: true,
	ignoreLocation: true,
	includeScore: true,

	keys: [
		{ name: "id", weight: 1 },
		{ name: "name", weight: 1 },
		{ name: "description", weight: 0.7 },
		{ name: "latestUpdate.temporaryNotice", weight: 0.5 },
		{ name: "info.text", weight: 0.4 },
		{ name: "presets.name", weight: 0.3 },
		{ name: "settings.name", weight: 0.3 },
		{ name: "credits.note", weight: 0.2 },
		{ name: "credits.name", weight: 0.1 },
	],
});

const command = defineCommand({
	data: {
		description: `Replies with information about a specific addon available in v${
			manifest.version_name || manifest.version
		}`,
		options: {
			addon: {
				description: "The name of the addon",
				required: true,
				autocomplete: true,
				type: ApplicationCommandOptionType.String,
			},
		},

		censored: "channel",
	},

	async interaction(interaction) {
		const input = interaction.options.getString("addon", true);
		const addon = fuse.search(input)[0]?.item;

		if (!addon) {
			await interaction.reply({
				content: `${CONSTANTS.emojis.statuses.no} Could not find a matching addon!`,

				ephemeral: true,
			});

			return;
		}

		const group = addon.tags.includes("popup")
			? "Extension Popup Features"
			: addon.tags.includes("easterEgg")
			? "Easter Eggs"
			: addon.tags.includes("theme")
			? `Themes -> ${addon.tags.includes("editor") ? "Editor" : "Website"} Themes`
			: addon.tags.includes("community")
			? "Scratch Website Features -> " +
			  (addon.tags.includes("profiles")
					? "Profiles"
					: addon.tags.includes("projectPage")
					? "Project Pages"
					: addon.tags.includes("forums")
					? "Forums"
					: "Others")
			: "Scratch Editor Features -> " +
			  (addon.tags.includes("codeEditor")
					? "Code Editor"
					: addon.tags.includes("costumeEditor")
					? "Costume Editor"
					: addon.tags.includes("projectPlayer")
					? "Project Player"
					: "Others");

		const credits = joinWithAnd(
			addon.credits?.map((credit) => {
				const note = ("note" in credit && credit.note) || "";
				return credit.link
					? hyperlink(escapeLinks(credit.name), credit.link, note)
					: interaction.channel
					? generateTooltip(interaction.channel, credit.name, note)
					: credit.name;
			}) ?? [],
		);

		const lastUpdatedIn =
			addon.latestUpdate?.version && `last updated in v${addon.latestUpdate.version}`;

		await interaction.reply({
			embeds: [
				{
					title: addon.name,
					color: CONSTANTS.themeColor,
					description:
						`${escapeMessage(addon.description)}\n` +
						`[See source code](https://github.com/${CONSTANTS.urls.saRepo}/tree/${
							manifest.version_name?.endsWith("-prerelease")
								? `main`
								: `v${encodeURI(manifest.version)}`
						}/addons/${encodeURIComponent(addon.id)}/)${
							addon.permissions?.length
								? "\n\n**⚠ This addon may require additional permissions to be granted in order to function.**"
								: ""
						}`,
					footer: { text: addon.id },
					thumbnail: {
						url: `${CONSTANTS.urls.addonImageRoot}/${encodeURIComponent(addon.id)}.png`,
					},
					url:
						group === "Easter Eggs"
							? undefined
							: `https://scratch.mit.edu/scratch-addons-extension/settings#addon-${encodeURIComponent(
									addon.id,
							  )}`,
					fields: [
						...(credits
							? [
									{
										name: "🫂 Contributors",
										value: escapeMarkdown(credits),
										inline: true,
									},
							  ]
							: []),
						{ inline: true, name: "📦 Group", value: escapeMarkdown(group) },
						{
							inline: true,
							name: "📝 Version added",
							value: escapeMarkdown(
								"v" +
									addon.versionAdded +
									(addon.latestUpdate && lastUpdatedIn
										? ` (${
												interaction.channel
													? generateTooltip(
															interaction.channel,
															lastUpdatedIn,
															addon.latestUpdate.temporaryNotice,
													  )
													: lastUpdatedIn
										  })`
										: ""),
							),
						},
					],
				},
			],
		});
	},

	async autocomplete(interaction) {
		await interaction.respond(
			fuse
				.search(interaction.options.getString("addon", true))
				.filter(({ score }, i) => i < 25 && (score || 0) < 0.1)
				.map((addon) => ({ name: addon.item.name, value: addon.item.id })),
		);
	},
});

export default command;
