import path from "node:path";
import url from "node:url";
import dns from "node:dns";
import { ActivityType, GatewayIntentBits } from "discord.js";
import "dotenv/config";

import pkg from "./package.json" assert { type: "json" };
import { GlobalFonts } from "@napi-rs/canvas";
import { login, client } from "strife.js";
import constants from "./common/constants.js";

dns.setDefaultResultOrder("ipv4first");
GlobalFonts.registerFromPath(
	path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), `../common/sora/font.ttf`),
	"Sora",
);

await login({
	modulesDir: path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "./modules"),
	commandsGuildId: process.env.GUILD_ID,
	async handleError(error, event) {
		await logError(error, event);
	},
	productionId: constants.users.scradd,
	clientOptions: {
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
			GatewayIntentBits.MessageContent,
			GatewayIntentBits.GuildScheduledEvents,
		],
		presence: { status: "dnd" },
	},
	commandErrorMessage: `${constants.emojis.statuses.no} An error occurred.`,
});

const { default: logError } = await import("./common/logError.js");

if (process.env.NODE_ENV === "production") {
	await import("./web/server.js");

	const { default: log, LoggingEmojis } = await import("./modules/logging/misc.js");
	await log(`${LoggingEmojis.Bot} Restarted bot on version **v${pkg.version}**`, "server");
}

client.user.setPresence({
	activities: [
		{
			name: process.env.NODE_ENV === "production" ? "the SA server!" : "for bugs…",
			type: ActivityType.Watching,
			url: "https://discord.gg/FPv957V6SD",
		},
	],
	status: "online",
});
