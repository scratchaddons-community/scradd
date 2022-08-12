import path from "path";
import url from "url";

import { Client, Collection, GatewayIntentBits, Partials } from "discord.js";
import dotenv from "dotenv";

import { importScripts } from "./lib/files.js";
import logError from "./lib/logError.js";

dotenv.config();

const dirname = path.dirname(url.fileURLToPath(import.meta.url));

const client = new Client({
	allowedMentions: { parse: ["users"], roles: [] },

	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildBans,
		GatewayIntentBits.GuildEmojisAndStickers,
		GatewayIntentBits.GuildIntegrations,
		GatewayIntentBits.GuildWebhooks,
		GatewayIntentBits.GuildInvites,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildPresences,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildMessageTyping,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.DirectMessageReactions,
		GatewayIntentBits.DirectMessageTyping,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildScheduledEvents,
	],

	failIfNotExists: false,

	partials: [
		Partials.User,
		Partials.Channel,
		Partials.GuildMember,
		Partials.Message,
		Partials.Reaction,
		Partials.GuildScheduledEvent,
		Partials.ThreadMember,
	],
	ws: { large_threshold: 0 },
});

const events = await /**
 * @template {keyof import("discord.js").ClientEvents} K
 *
 * @type {Promise<Collection<K, import("./types/event").default<K>>>}
 */ (importScripts(path.resolve(dirname, "./events")));

for (const [event, execute] of events.entries()) {
	if (execute.enable === false) continue;

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
