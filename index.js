import { Client, Intents as intents, MessageEmbed } from "discord.js";
import importScripts from "./lib/importScripts.js";
import dotenv from "dotenv";
import http from "http";

dotenv.config();
process.on("unhandledException", console.error);
process.on("unhandledRejection", console.error);

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
				const { ERROR_CHANNEL } = process.env;
				if (!ERROR_CHANNEL) throw new Error("ERROR_CHANNEL is not set in the .env");
				const testingChannel = await client.channels.fetch(ERROR_CHANNEL);

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

const server = http.createServer((_, res) => {
	res.writeHead(302, {
		location: "https://discord.gg/Cs25kzs889",
	});
	res.end();
});
server.listen(process.env.PORT || 80);
