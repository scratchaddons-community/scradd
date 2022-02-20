/** @file Fetch And output all commands. */
import { SlashCommandBuilder } from "@discordjs/builders";
import { User } from "discord.js";
import dotenv from "dotenv";

import importScripts from "./importScripts.js";

dotenv.config();

const commands = await importScripts("commands");

if (process.env.NODE_ENV !== "production") {
	commands.set("kill", {
		data: new SlashCommandBuilder().setDescription("Kills the bot."),

		interaction: ({ member }) => {
			if (
				member?.user instanceof User &&
				(Array.isArray(member.roles)
					? member.roles.includes("938439909742616616")
					: member.roles.valueOf().has("938439909742616616"))
			) {
				console.log(member.user.tag, "is killing the bot.");
				process.exit();
			}
		},
	});
}

for (const [name, command] of commands.entries())
	if (!command.data.name) command.data.setName(name);

export default commands;
