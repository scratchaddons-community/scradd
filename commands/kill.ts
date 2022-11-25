import { cleanDatabaseListeners } from "../common/database.js";
import { defineCommand } from "../common/types/command.js";

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
		process.emitWarning(interaction.user.tag + " is killing the bot");
		process.exit(1);
	},
});
export default command;
