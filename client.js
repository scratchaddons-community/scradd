import { Client, GatewayIntentBits, Partials } from "discord.js";
import path from "path";
import url from "url";
import CONSTANTS from "./common/CONSTANTS.js";
import { importScripts, pkg } from "./lib/files.js";
import logError from "./lib/logError.js";

const Handler = new Client({
	allowedMentions: { parse: ["users"], repliedUser: true },

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

const dirname = path.dirname(url.fileURLToPath(import.meta.url));

/** @type {Promise<Client<true>>} */
const readyPromise = new Promise((resolve) => Handler.once("ready", resolve));

await Handler.login(process.env.BOT_TOKEN);

const client = await readyPromise;

console.log(`Connected to Discord with tag ${client.user.tag ?? ""} on version ${pkg.version}`);

if (CONSTANTS.prodScradd === client.user.id && !process.argv.includes("--production")) {
	await logError(
		new OverconstrainedError(
			CONSTANTS.prodScradd,
			"Refusing to run on prod without --production flag",
		),
		"ready",
	);
	process.exit();
}

const events = await /**
 * @template {import("./types/event").ClientEvent} K
 *
 * @type {Promise<import("discord.js").Collection<K, () => Promise<import("./types/event").default<K>>>>}
 */ (importScripts(path.resolve(dirname, "./events")));

for (const [event, execute] of events.entries()) {
	Handler.on(event, async (...args) => {
		try {
			// @ts-expect-error -- IDK how to fix this
			return await (
				await execute()
			)(...args);
		} catch (error) {
			logError(error, event);
		}
	});
}
export default client;

export const guild = await client.guilds.fetch(process.env.GUILD_ID ?? "");
