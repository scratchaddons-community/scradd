/** @file Run Bot. */
import http from "http";

import { Client, Intents, MessageEmbed } from "discord.js";
import dotenv from "dotenv";

import importScripts from "./lib/importScripts.js";
import escape, { escapeForCodeblock } from "./lib/escape.js";

dotenv.config();
process.on("unhandledException", console.error);
process.on("unhandledRejection", console.error);

const client = new Client({
	intents: [
		Intents.FLAGS.GUILDS,
		Intents.FLAGS.GUILD_MESSAGES,
		Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
		Intents.FLAGS.DIRECT_MESSAGES,
	],

	partials: ["USER", "MESSAGE", "CHANNEL", "GUILD_MEMBER", "REACTION", "GUILD_SCHEDULED_EVENT"],
});

const events = await importScripts("events");

for (const [event, execute] of events.entries()) {
	client.on(event, async (...args) => {
		try {
			await execute(...args);

			return;
		} catch (error) {
			try {
				console.error(error);

				const embed = new MessageEmbed()
					.setTitle("Error!")
					.setDescription(
						`Uh-oh! I found an error! (event ${escape(
							event,
						)})\n\`\`\`json\n${escapeForCodeblock(JSON.stringify(error))}\`\`\``,
					)
					.setColor("RANDOM");
				const { ERROR_CHANNEL } = process.env;

				if (!ERROR_CHANNEL) throw new Error("ERROR_CHANNEL is not set in the .env");

				const testingChannel = await client.channels.fetch(ERROR_CHANNEL);

				if (!testingChannel?.isText())
					throw new Error("Could not find error reporting channel");

				await testingChannel.send({
					embeds: [embed],
				});
			} catch (errorError) {
				console.error(errorError);
			}
		}
	});
}

await client.login(process.env.BOT_TOKEN);

const server = http.createServer((_, response) => {
	response.writeHead(302, {
		location: "https://discord.gg/Cs25kzs889",
	});
	response.end();
});

server.listen(process.env.PORT || 80);
