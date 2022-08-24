import { PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { AbortError } from "node-fetch";
import { cleanListeners } from "../common/databases.js";
import logError from "../lib/logError.js";

/** @type {import("../types/command").default} */
export default {
	data: new SlashCommandBuilder()
		.setDescription(
			`(${
				process.env.NODE_ENV === "production" ? "Admin" : "Scradd dev"
			} only) Kills the bot.`,
		)
		.setDefaultMemberPermissions(new PermissionsBitField().toJSON()),

	async interaction(interaction) {
		await cleanListeners();
		await interaction.reply("Killing bot…");
		await logError(
			new AbortError(interaction.user.tag + " is killing the bot"),
			"interactionCreate",
		);
		process.exit();
	},
};
