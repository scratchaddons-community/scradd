import { AbortError } from "node-fetch";
import { cleanDatabaseListeners } from "../common/database.js";
import { defineCommand } from "../common/types/command.js";
import logError from "../util/logError.js";

const command = defineCommand({
	data: {
		description: `(${process.env.NODE_ENV === "production" ? "Admin" : "Scradd dev"} only) ${
			process.env.NODE_ENV === "production" ? "Restarts" : "Kills"
		} the bot.`,
		restricted: true,
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
});
export default command;
