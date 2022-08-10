import { SlashCommandBuilder } from "@discordjs/builders";
import { AbortError } from "node-fetch";
import { cleanListeners } from "../common/databases.js";
import logError from "../lib/logError.js";

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDescription(
			`(${
				process.env.NODE_ENV === "production" ? "Admin" : "Dev (non-fake)"
			} only) Kills the bot.`,
		)
		.setDefaultPermission(false),

	async interaction(interaction) {
		await cleanListeners();
		await interaction.reply("Killing bot...");
		await logError(
			new AbortError(interaction.user.tag + " is killing the bot"),
			"interactionCreate",
			interaction.client,
		);
		process.exit();
	},
};

export default info;
