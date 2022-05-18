/** @file Run Bot. */
import http from "http";
import path from "path";
import url from "url";

import { Client, Collection } from "discord.js";
import dotenv from "dotenv";

import { importScripts, pkg } from "./lib/files.js";
import logError from "./lib/logError.js";

dotenv.config();

const dirname = path.dirname(url.fileURLToPath(import.meta.url));

const client = new Client({
	allowedMentions: { parse: ["users"], roles: [] },

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

	failIfNotExists: false,
	restWsBridgeTimeout: 30_000,

	partials: ["USER", "MESSAGE", "CHANNEL", "GUILD_MEMBER", "REACTION", "GUILD_SCHEDULED_EVENT"],
	ws:{large_threshold: 250},
});

const events = await /**
 * @template {keyof import("discord.js").ClientEvents} K
 *
 * @type {Promise<Collection<K, import("./types/event").default<K>>>}
 */ (importScripts(path.resolve(dirname, "./events")));

for (const [event, execute] of events.entries()) {
	if (execute.apply === false) continue;

	client[execute.once ? "once" : "on"](event, async (...args) => {
		try {
			return await execute.event.call(client, ...args);
		} catch (error) {
			logError(error, event, client);
		}
	});
}

await client.login(process.env.BOT_TOKEN);

process
	.on("uncaughtException", (err, origin) => logError(err, origin, client))
	.on("warning", (err) => logError(err, "warning", client));

if (process.env.NODE_ENV === "production") {
	const server = http.createServer((_, response) => {
		response.writeHead(302, { location: pkg.homepage });
		response.end();
	});

	server.listen(process.env.PORT ?? 80);
}
