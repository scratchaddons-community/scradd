import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import commands from "./index.js";
import dotenv from "dotenv";
dotenv.config();

const rest = new REST({
	version: "9",
}).setToken(process.env.BOT_TOKEN || "");

console.log(commands.map((command) => command.data.toJSON()));
await rest
	.put(Routes.applicationGuildCommands(process.env.CLIENT_ID || "", process.env.GUILD_ID || ""), {
		body: commands.map((command) => command.data.toJSON()),
	})
	.then(() => console.log("Successfully registered application commands."))
	.catch(console.error);
