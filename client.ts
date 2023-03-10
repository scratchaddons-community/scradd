import { AssertionError } from "node:assert";

import { Client, GatewayIntentBits, Partials } from "discord.js";

import pkg from "./package.json" assert { type: "json" };
import { sanitizePath } from "./util/files.js";

const Handler = new Client({
	allowedMentions: { parse: ["users"], repliedUser: true },

	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildModeration,
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

	presence: { status: "dnd" },
});

const readyPromise = new Promise<Client<true>>((resolve) => Handler.once("ready", resolve));

Handler.on("debug", (message) => {
	if (
		process.env.NODE_ENV !== "production" ||
		!(message.includes("Sending a heartbeat") || message.includes("Heartbeat acknowledged"))
	)
		console.debug(message);
})
	.on("error", (error) => {
		throw error;
	})
	.on("warn", process.emitWarning)
	.rest.on("invalidRequestWarning", (data) => {
		process.emitWarning(
			`invalidRequestWarning: ${data.count} requests; ${data.remainingTime}ms left`,
		);
	})
	.on("restDebug", (message) => {
		if (
			process.env.NODE_ENV !== "production" ||
			!message.includes("Received bucket hash update")
		)
			console.debug(message);
	});

await Handler.login(process.env.BOT_TOKEN);

const client = await readyPromise;

console.log(`Connected to Discord with tag ${client.user.tag ?? ""} on version ${pkg.version}`);

if (client.user.tag === "Scradd#5905" && !process.argv.includes("--production")) {
	throw new AssertionError({
		actual: process.argv.map((argument) => sanitizePath(argument)),
		expected: "--production",
		operator: ".includes",
		message: "Refusing to run on prod without --production flag",
	});
}

export default client;
