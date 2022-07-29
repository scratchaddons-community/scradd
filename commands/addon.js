import { SlashCommandBuilder, EmbedBuilder } from "@discordjs/builders";
import { Util } from "discord.js";
import Fuse from "fuse.js";
import fetch from "node-fetch";
import CONSTANTS from "../common/CONSTANTS.js";

import escapeMessage, { escapeLinks } from "../lib/escape.js";
import generateTooltip from "../lib/generateTooltip.js";
import joinWithAnd from "../lib/joinWithAnd.js";

const addons = await fetch(
	"https://github.com/ScratchAddons/website-v2/raw/master/data/addons/en.json",
).then(
	async (response) =>
		/** @type {Promise<import("../types/addonManifest").WebsiteData>} */
		(await response.json()),
);

/** @type {{ [key: string]: import("../types/addonManifest").default }} */
const manifestCache = {};

const fuse = new Fuse(addons, {
	findAllMatches: true,
	ignoreLocation: true,
	includeScore: true,

	keys: [
		{ name: "id", weight: 1 },
		{ name: "name", weight: 1 },
		{ name: "description", weight: 0.5 },
	],
});

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDescription("Replies with information about a specific addon.")
		.addStringOption((option) =>
			option.setName("addon").setDescription("The name of the addon.").setRequired(true),
		)
		.addBooleanOption((input) =>
			input
				.setName("compact")
				.setDescription(
					"Whether to show misc information and the image. Defaults to false in #bots and true everywhere else.",
				)
				.setRequired(false),
		),

	async interaction(interaction) {
		/**
		 * Generate a string of Markdown that credits the makers of an addon.
		 *
		 * @param {import("../types/addonManifest").default["credits"]} credits - Addon manifest.
		 *
		 * @returns {string | undefined} - Returns credit information or undefined if no credits are
		 *   available.
		 */
		function generateCredits(credits) {
			return joinWithAnd(
				credits?.map(({ name, link, note }) =>
					link
						? `[${escapeLinks(name)}](${link} "${note}")`
						: note
						? generateTooltip(interaction, name, note)
						: name,
				) || [],
			);
		}

		const input = interaction.options.getString("addon") || "";
		const { item: addon, score = 0 } = fuse.search(input)[0] ?? {};

		const compact =
			interaction.options.getBoolean("compact") ??
			interaction.channel?.id !== process.env.BOTS_CHANNEL;

		if (!addon || (score > 0.5 && compact)) {
			await interaction.reply({
				content: `${CONSTANTS.emojis.statuses.no} Could not find a matching addon!`,

				ephemeral: true,
			});

			return;
		}

		const embed = new EmbedBuilder()
			.setTitle(addon.name)
			.setColor(CONSTANTS.colors.theme)
			.setDescription(
				`${escapeMessage(addon.description)}\n` +
					`[See source code](${CONSTANTS.repos.sa}/addons/${encodeURIComponent(
						addon.id,
					)}/)`,
			)
			.setFooter({
				text:
					Math.round((1 - score) * 100) +
					"% match" +
					CONSTANTS.footerSeperator +
					(compact ? "Compact mode" : addon.id),
			})
			[compact ? "setThumbnail" : "setImage"](
				`https://scratchaddons.com/assets/img/addons/${encodeURIComponent(addon.id)}.png`,
			);

		const group = addon.tags.includes("popup")
			? "Extension Popup Features"
			: addon.tags.includes("easterEgg")
			? "Easter Eggs"
			: addon.tags.includes("theme")
			? `Themes -> ${addon.tags.includes("editor") ? "Editor" : "Website"} Themes?`
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

		if (group !== "Easter Eggs") {
			embed.setURL(
				`https://scratch.mit.edu/scratch-addons-extension/settings#addon-${encodeURIComponent(
					addon.id,
				)}`,
			);
		}

		if (!compact) {
			const manifest = (manifestCache[addon.id] ??= await fetch(
				`${CONSTANTS.repos.sa}/addons/${addon.id}/addon.json?date=${Date.now()}`,
			).then(async (response) => {
				return await /** @type {Promise<import("../types/addonManifest").default>} */
				(response.json());
			}));

			const lastUpdatedIn = `last updated in v${
				manifest.latestUpdate?.version ?? "<unknown version>"
			}`;

			const credits = generateCredits(addon.credits);

			if (credits)
				embed.addFields([
					{
						name: "Contributors",
						value: Util.escapeMarkdown(credits),
						inline: true,
					},
				]);

			if (manifest.permissions?.length)
				embed.setDescription(
					embed.data.description +
						"\n" +
						"\n" +
						"**This addon may require additional permissions to be granted in order to function.**",
				);

			embed.addFields([
				{ inline: true, name: "Group", value: Util.escapeMarkdown(group) },
				{
					inline: true,
					name: "Version added",
					value: Util.escapeMarkdown(
						"v" +
							manifest.versionAdded +
							(manifest.latestUpdate
								? ` (${generateTooltip(
										interaction,
										lastUpdatedIn,
										`${manifest.latestUpdate?.temporaryNotice}`,
								  )})`
								: ""),
					),
				},
			]);
		}

		await interaction.reply({ embeds: [embed.toJSON()] });
	},
};

export default info;
