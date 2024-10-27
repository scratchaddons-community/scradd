import dns from "node:dns";
import { fileURLToPath } from "node:url";

import { GatewayIntentBits } from "discord.js";
import mongoose from "mongoose";
import { client, logError, login } from "strife.js";

import constants from "./common/constants.js";
import features from "./common/features.js";
import { LoggingEmojis, LoggingEmojisError } from "./modules/logging/util.js";
import pkg from "./package.json" with { type: "json" };

dns.setDefaultResultOrder("ipv4first");

if (
	process.env.BOT_TOKEN.startsWith(Buffer.from(constants.users.bot).toString("base64") + ".") &&
	!process.argv.includes("--production")
)
	throw new Error("Refusing to run on the production bot without `--production` flag");

await mongoose.connect(process.env.MONGO_URI);

if (features._canvas) {
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

	// eslint-disable-next-line @typescript-eslint/naming-convention
	const { Chart, _adapters } = await import("chart.js");
	Chart.defaults.font.family = constants.fonts;

	/**
	 * @author Parts Of this code were taken from
	 *   [org.jgrapes.webconsole.provider.chartjs](https://github.com/mnlipp/jgrapes-webconsole/blob/9381b2c/org.jgrapes.webconsole.provider.chartjs/resources/org/jgrapes/webconsole/provider/chartjs/chart.js/adapters/chartjs-adapter-simple.js)
	 *   and [chartjs-adapter-date-std](https://github.com/gcollin/chartjs-adapter-date-std/blob/c806f2b/src/index.ts)
	 */
	_adapters._date.override({
		init: () => void 0,
		formats: () => ({}),
		startOf: (time: number) => new Date(time).setHours(0, 0, 0, 0),
		diff(max: number, min: number) {
			const diff = (max - min) / 24 / 60 / 60 / 1000;
			return Math[diff < 0 ? "ceil" : "floor"](diff);
		},
		add: (time: number, amount: number) =>
			time + Math[amount < 0 ? "ceil" : "floor"](amount) * 86_400_000,
		format: (time: number) =>
			new Date(time).toLocaleString([], { weekday: "short", day: "numeric", month: "short" }),
	});
}

await login({
	modulesDirectory: fileURLToPath(new URL("./modules", import.meta.url)),
	defaultCommandAccess: process.env.GUILD_ID,
	handleError: { channel: getErrorsChannel, emoji: LoggingEmojisError },

	clientOptions: {
		intents:
			GatewayIntentBits.Guilds |
			GatewayIntentBits.GuildMembers |
			GatewayIntentBits.GuildModeration |
			GatewayIntentBits.GuildEmojisAndStickers |
			GatewayIntentBits.GuildWebhooks |
			GatewayIntentBits.GuildInvites |
			GatewayIntentBits.GuildVoiceStates |
			GatewayIntentBits.GuildPresences |
			GatewayIntentBits.GuildMessages |
			GatewayIntentBits.GuildMessageReactions |
			GatewayIntentBits.DirectMessages |
			GatewayIntentBits.MessageContent |
			GatewayIntentBits.GuildScheduledEvents |
			GatewayIntentBits.AutoModerationExecution,
		presence: { status: "dnd" },
	},
	commandErrorMessage: `${constants.emojis.statuses.no} An error occurred.`,
});

if (process.env.PORT) await import("./web/server.js");

const channel = await getErrorsChannel();
process
	.on(
		"uncaughtException",
		async (error, event) =>
			await logError({ error, event, channel, emoji: constants.emojis.statuses.no }),
	)
	.on(
		"warning",
		async (error) =>
			await logError({
				error,
				event: "warning",
				channel,
				emoji: constants.emojis.statuses.no,
			}),
	);

if (constants.env === "production") {
	await channel.send(`${LoggingEmojis.Bot} Restarted bot on version **v${pkg.version}**`);
}

const { cleanListeners } = await import("./common/database.js");
await cleanListeners();
client.user.setStatus("online");

async function getErrorsChannel() {
	const { default: config } = await import("./common/config.js");
	return config.channels.errors;
}
