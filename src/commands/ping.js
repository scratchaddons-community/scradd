import { SlashCommandBuilder } from "@discordjs/builders";

/** @type {import("../../types/command").default} */
const info = {
	command: new SlashCommandBuilder().setName("ping").setDescription("Replies with Pong!"),
	async onInteraction(interaction) {
		await interaction.reply("Pong!");
	},
};

export default info;
