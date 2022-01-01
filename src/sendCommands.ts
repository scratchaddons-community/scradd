import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import commands from "./getCommands";
import config from "./config.json";
import dotenv from "dotenv";
dotenv.config();

const rest = new REST({
	version: "9",
}).setToken(process.env.TOKEN || "");

await rest.put(
	Routes.applicationGuildCommands(config.guildId, config.clientId),
	{
		body: Object.values(commands).map((command) =>
			command.command.toJSON(),
		),
	},
);
