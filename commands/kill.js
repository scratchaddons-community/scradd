import { SlashCommandBuilder } from "@discordjs/builders";
import { AbortError } from "node-fetch";
import logError from "../lib/logError.js";

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder().setDescription("Kills the bot.").setDefaultPermission(false),

	async interaction(interaction) {
		await interaction.reply(interaction.user.tag + " is killing the bot.");
		await logError(
			new AbortError(interaction.user.tag + " is killing the bot."),
			"interactionCreate",
			interaction.client,
		);
		process.exit();
	},
};

export default info;
