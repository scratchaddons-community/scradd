import { AssertionError } from "assert";
import { ActivityType, Client, GatewayIntentBits, Partials } from "discord.js";
import path from "path";
import url from "url";
import type Event from "./common/types/event";
import { importScripts, sanitizePath } from "./util/files.js";
import pkg from "./package.json" assert { type: "json" };
import type { ClientEvent } from "./common/types/event";

const Handler = new Client({
	allowedMentions: { parse: ["users"], repliedUser: true },

	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildBans,
		GatewayIntentBits.GuildEmojisAndStickers,
		GatewayIntentBits.GuildWebhooks,
		GatewayIntentBits.GuildInvites,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildPresences,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.DirectMessages,
		// GatewayIntentBits.DirectMessageReactions,
		// GatewayIntentBits.DirectMessageTyping,
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

const readyPromise: Promise<Client<true>> = new Promise((resolve) =>
	Handler.once("ready", resolve),
);

Handler.rest
	.on("invalidRequestWarning", (data) =>
		process.emitWarning(
			`invalidRequestWarning: ${data.count} requests; ${data.remainingTime}ms left`,
		),
	)
	.on("rateLimited", console.log)
	.on("restDebug", (message) => {
		if (
			!message.includes("Received bucket hash update") ||
			process.env.NODE_ENV !== "production"
		)
			console.debug(message);
	});

const events = await importScripts<Event, ClientEvent>(
	path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "./events"),
	true,
);

for (const [event, execute] of events.entries()) {
	Handler.on(event, async (...args) => {
		try {
			await (
				await execute()
			)(...args);
		} catch (error) {
			logError(error, event);
		}
	});
}

await Handler.login(process.env.BOT_TOKEN);

const client = await readyPromise;

console.log(`Connected to Discord with tag ${client.user.tag ?? ""} on version ${pkg.version}`);

if (client.user.tag === "Scradd#5905" && !process.argv.includes("--production")) {
	throw new AssertionError({
		actual: process.argv.map((arg) => sanitizePath(arg)),
		expected: "--production",
		operator: ".includes",
		message: "Refusing to run on prod without --production flag",
	});
}

export default client;

client.user.setPresence({
	activities: [
		{
			name: process.env.NODE_ENV === "production" ? "the SA server!" : "for bugs…",
			type: ActivityType.Watching,
			url: pkg.homepage,
		},
	],
});

const { default: logError } = await import("./util/logError.js");
