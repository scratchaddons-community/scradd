import importScripts from "./importScripts.js";
import dotenv from "dotenv";
import { SlashCommandBuilder } from "@discordjs/builders";
dotenv.config();

const commands = await importScripts("commands");

if (process.env.NODE_ENV !== "production") {
	commands.set("kill", {
		data: new SlashCommandBuilder().setDescription("Kills the bot."),
		interaction: () => process.exit(),
	});
}
commands.forEach((command, name) => {
	if (!command.data.name) {
		command.data.setName(name);
	}
});

export default commands;
