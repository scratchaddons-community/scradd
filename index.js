import { Client, Intents as intents, MessageEmbed } from "discord.js";
import dotenv from "dotenv";
import importScripts from "./lib/importScriptsInFolder.js";

process.on("unhandledException", console.error);
process.on("unhandledRejection", console.error);
dotenv.config();

const client = new Client({
	intents: [
		intents.FLAGS.GUILDS,
		intents.FLAGS.GUILD_MESSAGES,
		intents.FLAGS.GUILD_MESSAGE_REACTIONS,
	],
	partials: ["USER", "REACTION", "MESSAGE"],
});

const events = await importScripts("events");

events.forEach(async (execute, event) =>
	client.on(event, async (...args) => {
		try {
			return await execute(...args);
		} catch (error) {
			try {
				console.error(error);

				const embed = new MessageEmbed()
					.setTitle("Error!")
					.setDescription(
						`Uhoh! I found an error! (event ${event})\n\`\`\`json\n${JSON.stringify(
							error,
						).replaceAll("[3 backticks]", "```")}\`\`\``,
					)
					.setColor("RANDOM");
				const testingChannel = await client.channels.fetch(process.env.ERROR_CHANNEL || "");

				if (!testingChannel || !("send" in testingChannel))
					throw new Error("Could not find error reporting channel");

				testingChannel.send({
					embeds: [embed],
				});
			} catch (errorError) {
				console.error(errorError);
			}
		}
	}),
);

client.login(process.env.BOT_TOKEN);
