/** @file Run Bot. */
import http from "http";

import { Client, MessageEmbed } from "discord.js";
import dotenv from "dotenv";

import escapeMessage, { escapeForCodeblock } from "./lib/escape.js";
import importScripts from "./lib/importScripts.js";

dotenv.config();
process.on("unhandledException", console.error);
process.on("unhandledRejection", console.error);

const client = new Client({
	allowedMentions: { parse: [], roles: [] },

	presence: {
		activities: [
			{
				name: process.env.NODE_ENV === "production" ? "the SA server!" : "for bugs...",
				type: "WATCHING",
				url: "https://scradd.openode.dev",
			},
		],
	},

	intents: [
		"GUILDS",
		"GUILD_MESSAGES",
		"GUILD_MESSAGE_REACTIONS",
		"DIRECT_MESSAGES",
		"GUILD_MEMBERS",
		"GUILD_BANS",
		"GUILD_EMOJIS_AND_STICKERS",
		"GUILD_INTEGRATIONS",
		"GUILD_WEBHOOKS",
		"GUILD_INVITES",
		"GUILD_VOICE_STATES",
		"GUILD_PRESENCES",
		"GUILD_MESSAGE_TYPING",
		"DIRECT_MESSAGE_REACTIONS",
		"DIRECT_MESSAGE_TYPING",
		"GUILD_SCHEDULED_EVENTS",
	],

	restGlobalRateLimit: 50,
	failIfNotExists: false,

	partials: ["USER", "MESSAGE", "CHANNEL", "GUILD_MEMBER", "REACTION", "GUILD_SCHEDULED_EVENT"],
});

const events = await importScripts("events");

for (const [event, execute] of events.entries()) {
	if (execute.apply === false) continue;

	client[execute.once ? "once" : "on"](event, async (...args) => {
		try {
			return await execute.event(...args);
		} catch (error) {
			try {
				console.error(error);

				const embed = new MessageEmbed()
					.setTitle("Error!")
					.setDescription(
						`Uh-oh! I found an error! (event ${escapeMessage(
							event,
						)})\n\`\`\`json\n${escapeForCodeblock(JSON.stringify(error))}\`\`\``,
					)
					.setColor("LUMINOUS_VIVID_PINK");
				const { ERROR_CHANNEL } = process.env;

				if (!ERROR_CHANNEL)
					throw new ReferenceError("ERROR_CHANNEL is not set in the .env");

				const testingChannel = await client.channels.fetch(ERROR_CHANNEL);

				if (!testingChannel?.isText())
					throw new ReferenceError("Could not find error reporting channel");

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
