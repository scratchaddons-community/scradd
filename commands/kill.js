import { SlashCommandBuilder } from "@discordjs/builders";
import CONSTANTS from "../common/CONSTANTS.js";
import logError from "../lib/logError.js";

/** @type {import("../types/command").default} */
const info = {
	apply: process.env.NODE_ENV !== "production",
	data: new SlashCommandBuilder().setDescription("Kills the bot.").setDefaultPermission(false),

	async interaction(interaction) {
		await logError(
			interaction.user.tag + " is killing the bot.",
			"interactionCreate",
			interaction.client,
		);
		process.exit();
	},

	permissions: [{ id: CONSTANTS.roles.developers, permission: true, type: "ROLE" }],
};

export default info;
