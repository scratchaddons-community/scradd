import { PermissionsBitField } from "discord.js";
import { AbortError } from "node-fetch";
import { cleanDatabaseListeners } from "../common/database.js";
import type { ChatInputCommand } from "../common/types/command.js";
import logError from "../util/logError.js";

const command: ChatInputCommand = {
	data: {
		description: `(${process.env.NODE_ENV === "production" ? "Admin" : "Scradd dev"} only) ${
			process.env.NODE_ENV === "production" ? "Restarts" : "Kills"
		} the bot.`,
		default_member_permissions: new PermissionsBitField().toJSON(),
	},

	async interaction(interaction) {
		await cleanDatabaseListeners();
		await interaction.reply("Killing bot…");
		await logError(
			new AbortError(interaction.user.tag + " is killing the bot"),
			"interactionCreate",
		);
		process.exit(1);
	},
};
export default command;
