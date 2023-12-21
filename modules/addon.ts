import {
	ApplicationCommandOptionType,
	ButtonStyle,
	ComponentType,
	hyperlink,
	AutocompleteInteraction,
} from "discord.js";
import { matchSorter } from "match-sorter";
import constants from "../common/constants.js";
import addons from "@sa-community/addons-data" assert { type: "json" };
import { defineChatCommand } from "strife.js";
import { escapeMessage } from "../util/markdown.js";
import { joinWithAnd } from "../util/text.js";
import sa from "@sa-community/addons-data/manifest.json" assert { type: "json" };

defineChatCommand(
	{
		name: "addon",
		censored: "channel",
		description: `Replies with information about a specific addon available in v${sa.version_name}`,

		options: {
			addon: {
				autocomplete(interaction: AutocompleteInteraction) {
					return matchSorter(
						addons,
						interaction.options.getString("addon") ?? "",
						constants.addonSearchOptions,
					).map((addon) => ({ name: addon.manifest.name, value: addon.addonId }));
				},
				description: "The name of the addon",
				required: true,
				type: ApplicationCommandOptionType.String,
			},
		},
		access: true,
	},

	async (interaction, options) => {
		const { manifest: addon, addonId } =
			matchSorter(addons, options.addon, constants.addonSearchOptions)[0] ?? {};

		if (!addon || !addonId) {
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
			? `Themes → ${addon.tags.includes("editor") ? "Editor" : "Website"} Themes`
			: addon.tags.includes("community")
			? `Scratch Website Features → ${
					addon.tags.includes("profiles")
						? "Profiles"
						: addon.tags.includes("projectPage")
						? "Project Pages"
						: addon.tags.includes("forums")
						? "Forums"
						: "Others"
			  }`
			: `Scratch Editor Features → ${
					addon.tags.includes("codeEditor")
						? "Code Editor"
						: addon.tags.includes("costumeEditor")
						? "Costume Editor"
						: addon.tags.includes("projectPlayer")
						? "Project Player"
						: "Others"
			  }`;

		const credits = joinWithAnd(addon.credits ?? [], (credit) => {
			return credit.note || credit.link
				? hyperlink(
						credit.name,
						credit.link ?? interaction.channel?.url ?? "",
						credit.note ?? "",
				  )
				: credit.name;
		});

		const updateInfo = `v${addon.versionAdded}${
			addon.latestUpdate?.version
				? ` (${hyperlink(
						`last updated in v${addon.latestUpdate.version}`,
						interaction.channel?.url ?? "",
						addon.latestUpdate.temporaryNotice ?? "",
				  )})`
				: ""
		}`;

		await interaction.reply({
			embeds: [
				{
					description:
						`${escapeMessage(addon.description)}\n` +
						(addon.permissions?.length
							? "\n\n**⚠ This addon may require additional permissions to be granted in order to function.**"
							: ""),

					fields: [
						...(credits.length
							? [{ inline: true, name: "🫂 Contributors", value: credits }]
							: []),
						{ inline: true, name: "📦 Group", value: escapeMessage(group) },
						{ inline: true, name: "📝 Version added", value: updateInfo },
					],

					color: constants.themeColor,
					footer: { text: addonId },
					thumbnail: { url: `${constants.urls.addonImageRoot}/${addonId}.png` },
					title: addon.name,
					url: `https://github.com/${constants.urls.saRepo}/tree/v${sa.version}/addons/${addonId}/`,
				},
			],

			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							style: ButtonStyle.Link,
							url: `${constants.urls.settingsPage}#addon-${addonId}`,
							label: "Enable Addon",
						},
					],
				},
			],
		});
	},
);
