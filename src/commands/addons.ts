import { SlashCommandBuilder } from "@discordjs/builders";
import type CommandInfo from "../../types/command";
import { MessageEmbed } from "discord.js";
import Fuse from "fuse.js";
import fetch from "node-fetch";
import type AddonManifest from "../../types/addonManifest";
import tooltip from "../tooltip.js";

const addons = await fetch(
	"https://github.com/ScratchAddons/ScratchAddons/raw/master/addons/addons.json",
)
	.then((res) => res.json())
	.then((addons) =>
		(addons as string[]).filter((addon) => !addon.startsWith("//")),
	);

const fuse = new Fuse(
	await Promise.all(
		addons.map(async (addon) => {
			const manifest = await fetch(
				"https://github.com/ScratchAddons/ScratchAddons/raw/master/addons/" +
					addon +
					"/addon.json",
			).then((res) => res.json() as Promise<AddonManifest>);
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

const info: CommandInfo = {
	command: new SlashCommandBuilder()
		.setName("addon")
		.setDescription("Replies with information about a specific addon.")
		.addStringOption((option) =>
			option
				.setName("addon_name")
				.setDescription("The name of the addon")
				.setRequired(true),
		),

	async onInteraction(interaction) {
		const addon = interaction.options.getString("addon_name") || "";
		const addonInfo = fuse.search(addon).sort((a, b) => {
			a.score ??= 0;
			b.score ??= 0;
			// Sort very good matches at the top no matter what
			if (+(a.score < 0.1) ^ +(b.score < 0.1))
				return a.score < 0.1 ? -1 : 1;
			else return 0;
		})[0]?.item;

		if (!addonInfo) {
			await interaction.reply("That addon does not exist!");
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

		const exampleEmbed = new MessageEmbed()
			.setTitle(addonInfo.name)
			.setColor("#0099ff")
			.setDescription(
				addonInfo.description +
					(addonInfo.permissions?.length
						? "\n\n**This addon may require additional permissions to be granted in order to function.**"
						: ""),
			)
			.addFields([
				{
					name: "Contributors",
					value: (
						addonInfo.credits as { name: string; link?: string }[]
					)
						.map(({ name, link }) =>
							link ? `[${name}](${link})` : name,
						)
						.join(", "),
					inline: true,
				},
				{
					name: "Enabled by default?",
					value: addonInfo.enabledByDefault ? "Yes" : "No",
					inline: true,
				},
				{
					name: "Version added",
					value: addonInfo.versionAdded + latestUpdateInfo,
					inline: true,
				},
				{
					name: "Group",
					value: addonInfo.tags.includes("popup")
						? "Extension Popup Features"
						: addonInfo.tags.includes("easterEgg")
						? "Easter Eggs"
						: addonInfo.tags.includes("theme")
						? "Themes"
						: addonInfo.tags.includes("community")
						? "Scratch Website Features"
						: "Scratch Editor Features",
					inline: true,
				},
			])
			.setImage(
				`https://scratchaddons.com/assets/img/addons/${addonInfo.id}.png`,
			);

		await interaction.reply({ embeds: [exampleEmbed] });
	},
};
export default info;
