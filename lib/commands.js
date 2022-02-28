/** @file Fetch And output all commands. */
import { SlashCommandBuilder } from "@discordjs/builders";
import { User } from "discord.js";

import importScripts from "./importScripts.js";

const commands = await importScripts("commands");

for (const [name, command] of commands.entries())
	if (!command.data.name) command.data.setName(name);

export default commands;
