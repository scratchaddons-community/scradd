import { SlashCommandBuilder } from "@discordjs/builders";
import { MessageEmbed } from "discord.js";
import Fuse from "fuse.js";
import fetch from "node-fetch";
import tooltip from "../lib/tooltip.js";

const addons = await fetch(
	"https://github.com/ScratchAddons/ScratchAddons/raw/master/addons/addons.json",
)
	.then((res) => /** @type {Promise<string[]>} */ (res.json()))
	.then((addons) => addons.filter((addon) => !addon.startsWith("//")));

const fuse = new Fuse(
	await Promise.all(
		addons.map(async (addon) => {
			const manifest = await fetch(
				"https://github.com/ScratchAddons/ScratchAddons/raw/master/addons/" +
					addon +
					"/addon.json",
			).then(
				(res) =>
					/** @type {Promise<import("../types/addonManifest").default>} */ (res.json()),
			);
			return { ...manifest, id: addon };
		}),
	),
	{
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
			{
				name: "credits.name",
				weight: 0.2,
			},
			{
				name: "info.text",
				weight: 0.1,
			},
		],
	},
);

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDescription("Replies with information about a specific addon.")
		.addStringOption((option) =>
			option.setName("addon_name").setDescription("The name of the addon").setRequired(true),
		),

	async interaction(interaction) {
		const addon = interaction.options.getString("addon_name") || "";
		const addonInfo = fuse.search(addon).sort((a, b) => {
			a.score ??= 0;
			b.score ??= 0;
			// Sort very good matches at the top no matter what
			if (+(a.score < 0.1) ^ +(b.score < 0.1)) return a.score < 0.1 ? -1 : 1;
			else return 0;
		})[0]?.item;

		if (!addonInfo) {
			await interaction.reply({
				content: "That addon does not exist!",
				ephemeral: true,
			});
			return;
		}

		let latestUpdateInfo = "";
		if (addonInfo.latestUpdate) {
			const lastUpdatedIn = `last updated in ${addonInfo.latestUpdate?.version}`;
			latestUpdateInfo =
				" (" +
				(addonInfo.latestUpdate.temporaryNotice
					? tooltip(
							interaction,
							lastUpdatedIn,
							`${addonInfo.latestUpdate?.temporaryNotice}`,
					  )
					: lastUpdatedIn) +
				")";
		}

		const embed = new MessageEmbed()
			.setTitle(addonInfo.name)
			.setColor("#0099ff")
			.setDescription(
				addonInfo.description +
					`\n[See source code](https://github.com/ScratchAddons/ScratchAddons/tree/master/addons/${addonInfo.id})` +
					(addonInfo.permissions?.length
						? "\n\n**This addon may require additional permissions to be granted in order to function.**"
						: ""),
			)
			.setImage(`https://scratchaddons.com/assets/img/addons/${addonInfo.id}.png`);

		const group = addonInfo.tags.includes("popup")
			? "Extension Popup Features"
			: addonInfo.tags.includes("easterEgg")
			? "Easter Eggs"
			: addonInfo.tags.includes("theme")
			? "Themes"
			: addonInfo.tags.includes("community")
			? "Scratch Website Features"
			: "Scratch Editor Features";

		if (group !== "Easter Eggs")
			embed.setURL(
				`https://scratch.mit.edu/scratch-addons-extension/settings#addon-${addonInfo.id}`,
			);

		if (addonInfo.credits?.length)
			embed.addField(
				"Contributors",
				addonInfo.credits
					?.map(({ name, link }) => (link ? `[${name}](${link})` : name))
					.join(", "),
				true,
			);

		embed.addFields([
			{
				name: "Group",
				value: group,
				inline: true,
			},
			{
				name: "Version added",
				value: addonInfo.versionAdded + latestUpdateInfo,
				inline: true,
			},
		]);

		await interaction.reply({ embeds: [embed] });
	},
};
export default info;
