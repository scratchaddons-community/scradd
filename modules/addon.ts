import { ApplicationCommandOptionType, escapeMarkdown, hyperlink } from "discord.js";
import { Searcher } from "fast-fuzzy";

import constants from "../common/constants.js";
import { manifest, addons } from "../common/extension.js";
import defineCommand from "../lib/commands.js";
import { escapeMessage, generateTooltip } from "../util/markdown.js";
import { joinWithAnd } from "../util/text.js";

const searcher = new Searcher(addons, {
	threshold: 0.1,
	ignoreSymbols: false,

	keySelector(addon) {
		return [
			addon.id,
			addon.name,
			addon.description,
			addon.latestUpdate?.temporaryNotice ?? "",
			addon.info?.map((info) => info.text) ?? "",
			addon.presets?.map((preset) => preset.name) ?? "",
			addon.settings?.map((setting) => setting.name) ?? "",
			addon.credits?.map((credit) => [credit.note ?? "", credit.name]) ?? "",
		].flat(2);
	},
});

defineCommand(
	{
		name: "addon",
		censored: "channel",
		description: `Replies with information about a specific addon available in v${
			manifest.version_name ?? manifest.version
		}`,

		options: {
			addon: {
				autocomplete(interaction) {
					const query = interaction.options.getString("addon");
					return (query?.trim() ? searcher.search(query) : addons.slice(25)).map((addon) => ({
						name: addon.name,
						value: addon.id,
					}));
				},
				description: "The name of the addon",
				required: true,
				type: ApplicationCommandOptionType.String,
			},
		},
	},

	async (interaction) => {
		const input = interaction.options.getString("addon", true);
		const addon = searcher.search(input)[0];

		if (!addon) {
			await interaction.reply({
				content: `${constants.emojis.statuses.no} Could not find a matching addon!`,

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
			? `Scratch Website Features -> ${
					addon.tags.includes("profiles")
						? "Profiles"
						: addon.tags.includes("projectPage")
						? "Project Pages"
						: addon.tags.includes("forums")
						? "Forums"
						: "Others"
			  }`
			: `Scratch Editor Features -> ${
					addon.tags.includes("codeEditor")
						? "Code Editor"
						: addon.tags.includes("costumeEditor")
						? "Costume Editor"
						: addon.tags.includes("projectPlayer")
						? "Project Player"
						: "Others"
			  }`;

		const credits = joinWithAnd(
			addon.credits?.map((credit) => {
				const note = ("note" in credit && credit.note) || "";
				return credit.link
					? hyperlink(credit.name, credit.link, note)
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
					color: constants.themeColor,

					description:
						`${escapeMessage(addon.description)}\n` +
						`[See source code](https://github.com/${constants.urls.saRepo}/tree/${
							manifest.version_name?.endsWith("-prerelease")
								? "main"
								: `v${encodeURI(manifest.version)}`
						}/addons/${encodeURIComponent(addon.id)}/)${
							addon.permissions?.length
								? "\n\n**⚠ This addon may require additional permissions to be granted in order to function.**"
								: ""
						}`,

					fields: [
						...(credits
							? [
									{
										inline: true,
										name: "🫂 Contributors",
										value: escapeMarkdown(credits),
									},
							  ]
							: []),
						{ inline: true, name: "📦 Group", value: escapeMarkdown(group) },
						{
							inline: true,
							name: "📝 Version added",

							value: escapeMarkdown(
								`v${addon.versionAdded}${
									addon.latestUpdate && lastUpdatedIn
										? ` (${
												interaction.channel
													? generateTooltip(
															interaction.channel,
															lastUpdatedIn,
															addon.latestUpdate.temporaryNotice,
													  )
													: lastUpdatedIn
										  })`
										: ""
								}`,
							),
						},
					],

					footer: { text: `${addon.id}\nClick the addon name to enable it!` },

					thumbnail: {
						url: `${constants.urls.addonImageRoot}/${encodeURIComponent(addon.id)}.png`,
					},

					title: addon.name,

					url:
						group === "Easter Eggs"
							? undefined
							: `${constants.urls.settingsPage}#addon-${encodeURIComponent(
									addon.id,
							  )}`,
				},
			],
		});
	},
);
