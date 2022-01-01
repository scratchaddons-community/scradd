import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import commands from "./getCommands.js";
import dotenv from "dotenv";
dotenv.config();

const rest = new REST({
	version: "9",
}).setToken(process.env.BOT_TOKEN || "");

await rest.put(
	Routes.applicationGuildCommands(process.env.CLIENT_ID||"", process.env.GUILD_ID||""),
	{

		body: Object.values(commands).map((command) =>
			command.command.toJSON(),
		),
	},
);
