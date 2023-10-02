import { fileURLToPath } from "node:url";
import dns from "node:dns";
import { ActivityType, GatewayIntentBits } from "discord.js";
import { homepage, version } from "./package.json" assert { type: "json" };
import { login, client } from "strife.js";
import constants from "./common/constants.js";

dns.setDefaultResultOrder("ipv4first");

if (
	process.env.BOT_TOKEN.startsWith(
		Buffer.from(constants.users.scradd).toString("base64") + ".",
	) &&
	!process.argv.includes("--production")
)
	throw new Error("Refusing to run on production Scradd without `--production` flag");

if (process.env.CANVAS !== "false") {
	const { GlobalFonts } = await import("@napi-rs/canvas");
	GlobalFonts.registerFromPath(
		fileURLToPath(
			import.meta.resolve("@fontsource-variable/sora/files/sora-latin-wght-normal.woff2"),
		),
		"Sora",
	);
	GlobalFonts.registerFromPath(
		fileURLToPath(
			import.meta.resolve("@fontsource-variable/sora/files/sora-latin-ext-wght-normal.woff2"),
		),
		"SoraExt",
	);

	const { Chart } = await import("chart.js");
	Chart.defaults.font.family = constants.fonts;
}

await login({
	modulesDirectory: fileURLToPath(new URL("./modules", import.meta.url)),
	defaultCommandAccess: process.env.GUILD_ID,
	async handleError(error, event) {
		const { default: logError } = await import("./modules/logging/errors.js");

		await logError(error, event);
	},
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

if (process.env.NODE_ENV === "production") {
	await import("./web/server.js");

	const { default: log, LoggingEmojis } = await import("./modules/logging/misc.js");
	await log(`${LoggingEmojis.Bot} Restarted bot on version **v${version}**`, "server");
}

client.user.setPresence({
	activities: [
		{
			name: process.env.NODE_ENV === "production" ? "the SA server!" : "for bugs…",
			type: ActivityType.Watching,
			url: homepage,
		},
	],
	status: "online",
});
