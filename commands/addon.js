/** @file Command To get information about an addon. */
import { SlashCommandBuilder } from "@discordjs/builders";
import { MessageEmbed } from "discord.js";
import Fuse from "fuse.js";
import fetch from "node-fetch";

import escapeMessage, { escapeForInlineCode, escapeLinks } from "../lib/escape.js";
import generateTooltip from "../lib/generateTooltip.js";

const addons = await fetch(
	"https://raw.githubusercontent.com/ScratchAddons/website-v2/master/data/addons/en.json",
).then(
	async (response) =>
		/** @type {Promise<import("../types/addonManifest").WebsiteData>} */ (
			await response.json()
		),
);

const fuse = new Fuse(addons, {
	findAllMatches: true,
	ignoreLocation: true,
	includeScore: true,

	keys: [
		{
			name: "name",
			weight: 1,
		},
		{
			name: "id",
			weight: 1,
		},
		{
			name: "description",
			weight: 0.9,
		},
	],

	shouldSort: true,
	threshold: 0,
	useExtendedSearch: true,
});

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDescription("Replies with information about a specific addon.")
		.addStringOption((option) =>
			option
				.setName("addon")
				.setDescription(
					"The name of the addon. Leave empty to learn about a random addon.",
				),
		),

	async interaction(interaction) {
		/**
		 * Generate a string of Markdown that credits the makers of an addon.
		 *
		 * @param {import("../types/addonManifest").default} arg0 - Addon manifest.
		 *
		 * @returns {string | undefined} - Returns credit information or undefined if no credits are
		 *   available.
		 */
		function generateCredits({ credits }) {
			return credits
				?.map(({ name, link, note = "" }) =>
					link
						? `[${escapeLinks(name)}](${link} "${note}")`
						: note
						? generateTooltip(interaction, name, note)
						: name,
				)
				.join(", ");
		}

		const input = interaction.options.getString("addon");
		const item = input
			? fuse.search(input).sort(({ score: scoreOne = 0 }, { score: scoreTwo = 0 }) =>
					// Sort very good matches at the top no matter what
					+(scoreOne < 0.1) ^ +(scoreTwo < 0.1) ? (scoreOne < 0.1 ? -1 : 1) : 0,
			  )[0]?.item
			: addons[Math.floor(Math.random() * addons.length)];

		if (!item) {
			await interaction.reply({
				content: `<:no:940054047854047282> That addon${
					input ? ` (\`${escapeForInlineCode(input)}\`)` : ""
				} does not exist!`,

				ephemeral: true,
			});

			return;
		}

		const addon = await fetch(
			`https://github.com/ScratchAddons/ScratchAddons/raw/master/addons/${item.id}/addon.json`,
		).then(
			async (response) =>
				/** @type {Promise<import("../types/addonManifest").default>} */ (
					await response.json()
				),
		);

		const lastUpdatedIn = `last updated in ${
			addon.latestUpdate?.version || "<unknown version>"
		}`;
		const latestUpdateInfo = addon.latestUpdate
			? ` (${
					addon.latestUpdate.temporaryNotice
						? generateTooltip(
								interaction,
								lastUpdatedIn,
								`${addon.latestUpdate?.temporaryNotice}`,
						  )
						: lastUpdatedIn
			  })`
			: "";

		const embed = new MessageEmbed()
			.setTitle(addon.name)
			.setColor("BLURPLE")
			.setDescription(
				`${escapeMessage(
					addon.description,
				)}\n[See source code](https://github.com/ScratchAddons/ScratchAddons/tree/master/addons/${encodeURIComponent(
					item.id,
				)})${
					addon.permissions?.length
						? "\n\n**This addon may require additional permissions to be granted in order to function.**"
						: ""
				}`,
			)
			.setImage(
				`https://scratchaddons.com/assets/img/addons/${encodeURIComponent(item.id)}.png`,
			)
			.setFooter({
				text: input ? `Input: ${input}` : "Random addon",
			});

		const group = addon.tags.includes("popup")
			? "Extension Popup Features"
			: addon.tags.includes("easterEgg")
			? "Easter Eggs"
			: addon.tags.includes("theme")
			? "Themes"
			: addon.tags.includes("community")
			? "Scratch Website Features"
			: "Scratch Editor Features";

		if (group !== "Easter Eggs") {
			embed.setURL(
				`https://scratch.mit.edu/scratch-addons-extension/settings#addon-${encodeURIComponent(
					item.id,
				)}`,
			);
		}

		const credits = generateCredits(addon);

		if (credits) embed.addField("Contributors", credits, true);

		embed.addFields([
			{
				inline: true,
				name: "Group",
				value: escapeMessage(group),
			},
			{
				inline: true,
				name: "Version added",
				value: escapeMessage(addon.versionAdded + latestUpdateInfo),
			},
		]);

		await interaction.reply({ embeds: [embed] });
	},
};

export default info;
