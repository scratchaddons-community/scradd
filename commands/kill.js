import { SlashCommandBuilder } from "@discordjs/builders";
import CONSTANTS from "../common/CONSTANTS.js";

/** @type {import("../types/command").default} */
const info = {
	apply: process.env.NODE_ENV !== "production",
	data: new SlashCommandBuilder().setDescription("Kills the bot.").setDefaultPermission(false),

	interaction: (interaction) => {
		console.log(interaction.user.tag, "is killing the bot.");
		process.exit();
	},

	permissions: [{ id: CONSTANTS.roles.developers, permission: true, type: "ROLE" }],
};

export default info;
