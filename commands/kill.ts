import { PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { AbortError } from "node-fetch";
import { cleanDatabaseListeners } from "../common/database.js";
import type { ChatInputCommand } from "../common/types/command.js";
import logError from "../lib/logError.js";

const info: ChatInputCommand = {
	data: new SlashCommandBuilder()
		.setDescription(
			`(${process.env.NODE_ENV === "production" ? "Admin" : "Scradd dev"} only) ${
				process.env.NODE_ENV === "production" ? "Restarts" : "Kills"
			} the bot.`,
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
export default info;
