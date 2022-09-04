import { PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { AbortError } from "node-fetch";
import { cleanDatabaseListeners } from "../common/database.js";
import logError from "../lib/logError.js";

/** @type {import("../common/types/command").ChatInputCommand} */
export default {
	data: new SlashCommandBuilder()
		.setDescription(
			`(${
				process.env.NODE_ENV === "production" ? "Admin" : "Scradd dev"
			} only) Kills the bot.`,
		)
		.setDefaultMemberPermissions(new PermissionsBitField().toJSON()),

	async interaction(interaction) {
		await cleanDatabaseListeners();
		await interaction.reply("Killing bot…");
		await logError(
			new AbortError(interaction.user.tag + " is killing the bot"),
			"interactionCreate",
		);
		process.exit();
	},
};
