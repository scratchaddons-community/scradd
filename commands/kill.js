import { SlashCommandBuilder } from "@discordjs/builders";
import logError from "../lib/logError.js";

/** @type {import("../types/command").default} */
const info = {
	apply: process.env.NODE_ENV !== "production",
	data: new SlashCommandBuilder().setDescription("Kills the bot.").setDefaultPermission(false),

	async interaction(interaction) {
		await interaction.reply(interaction.user.tag + " is killing the bot.");
		await logError(
			interaction.user.tag + " is killing the bot.",
			"interactionCreate",
			interaction.client,
		);
		process.exit();
	},
};

export default info;
