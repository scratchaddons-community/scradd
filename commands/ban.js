/** @file Ban Command. */
import { MessageActionRow, MessageButton } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDescription("(Mods only) Ban a user.")
		.addUserOption((option) =>
			option.setName("user").setDescription("The user you want to ban.").setRequired(true),
		)
		.setDefaultPermission(false),

	async interaction(interaction) {
		const user = interaction.options.getUser("user");
		const buttons = new MessageActionRow().addComponents(
			new MessageButton().setCustomId("ban").setLabel("Ban").setStyle("DANGER"),
			new MessageButton().setCustomId("cancel").setLabel("Cancel").setStyle("SECONDARY"),
		);
		await Promise.all([
			interaction.reply({
				content: `Are you sure you want to ban ${user}?`,
				components: [buttons],
			}),
		]);
	},

	permissions: [{ id: process.env.MODERATOR_ROLE || "", permission: true, type: "ROLE" }],
};

export default info;
