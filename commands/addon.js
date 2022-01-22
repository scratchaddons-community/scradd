import { SlashCommandBuilder } from "@discordjs/builders";
import { MessageEmbed } from "discord.js";
import Fuse from "fuse.js";
import fetch from "node-fetch";
import tooltip from "../lib/tooltip.js";

const addons = await fetch(
	"https://raw.githubusercontent.com/ScratchAddons/website-v2/master/data/addons/en.json",
).then((res) => /** @type {Promise<import("../types/addonManifest").WebsiteData>} */ (res.json()));

const fuse = new Fuse(addons, {
	includeScore: true,
	threshold: 0.35,
	ignoreLocation: true,
	useExtendedSearch: true,
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
			weight: 0.5,
		},
	],
});

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDescription("Replies with information about a specific addon.")
		.addStringOption((option) =>
			option.setName("addon_name").setDescription("The name of the addon"),
		),

	async interaction(interaction) {
		/** @param {import("../types/addonManifest").default} credits */
		function generateCredits({ credits }) {
			return credits
				?.map(({ name, link, note }) =>
					link
						? `[${name}](${link} "${note || ""}")`
						: note
						? tooltip(interaction, name, note)
						: name,
				)
				.join(", ");
		}

		const input = interaction.options.getString("addon_name");
		const result = input
			? fuse.search(input).sort((a, b) => {
					a.score ??= 0;
					b.score ??= 0;
					// Sort very good matches at the top no matter what
					if (+(a.score < 0.1) ^ +(b.score < 0.1)) return a.score < 0.1 ? -1 : 1;
					else return 0;
			  })[0]?.item
			: addons[Math.floor(Math.random() * addons.length)];

		if (!result) {
			return interaction.reply({
				content: "That addon does not exist!",
				ephemeral: true,
			});
		}

		const addon = await fetch(
			"https://github.com/ScratchAddons/ScratchAddons/raw/master/addons/" +
				result.id +
				"/addon.json",
		).then(
			(res) => /** @type {Promise<import("../types/addonManifest").default>} */ (res.json()),
		);

		const lastUpdatedIn = `last updated in ${addon.latestUpdate?.version}`;
		const latestUpdateInfo = addon.latestUpdate
			? " (" +
			  (addon.latestUpdate.temporaryNotice
					? tooltip(interaction, lastUpdatedIn, `${addon.latestUpdate?.temporaryNotice}`)
					: lastUpdatedIn) +
			  ")"
			: "";

		const embed = new MessageEmbed()
			.setTitle(addon.name)
			.setColor("BLURPLE")
			.setDescription(
				addon.description +
					`\n[See source code](https://github.com/ScratchAddons/ScratchAddons/tree/master/addons/${result.id})` +
					(addon.permissions?.length
						? "\n\n**This addon may require additional permissions to be granted in order to function.**"
						: ""),
			)
			.setImage(`https://scratchaddons.com/assets/img/addons/${result.id}.png`);

		const group = addon.tags.includes("popup")
			? "Extension Popup Features"
			: addon.tags.includes("easterEgg")
			? "Easter Eggs"
			: addon.tags.includes("theme")
			? "Themes"
			: addon.tags.includes("community")
			? "Scratch Website Features"
			: "Scratch Editor Features";

		if (group !== "Easter Eggs")
			embed.setURL(
				`https://scratch.mit.edu/scratch-addons-extension/settings#addon-${result.id}`,
			);

		const credits = generateCredits(addon);
		if (credits) embed.addField("Contributors", credits, true);

		embed.addFields([
			{
				name: "Group",
				value: group,
				inline: true,
			},
			{
				name: "Version added",
				value: addon.versionAdded + latestUpdateInfo,
				inline: true,
			},
		]);

		await interaction.reply({ embeds: [embed] });
	},
};
export default info;
