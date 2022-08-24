import { AssertionError } from "assert";
import path from "path";
import url from "url";

import { ActivityType } from "discord.js";
import dotenv from "dotenv";

import CONSTANTS from "./common/CONSTANTS.js";
import { importScripts, pkg } from "./lib/files.js";
import fetch from "node-fetch";

dotenv.config();
const { default: client, guild } = await import("./client.js");
const { default: logError } = await import("./lib/logError.js");

process
	.on("uncaughtException", (err, origin) => logError(err, origin))
	.on("warning", (err) => logError(err, "warning"));

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

client.user.setPresence({
	activities: [
		{
			name:
				process.env.NODE_ENV === "production" || CONSTANTS.prodScradd === client.user.id
					? "the SA server!"
					: "for bugs…",
			type: ActivityType.Watching,
			url: pkg.homepage,
		},
	],
});

if (process.env.NODE_ENV === "production")
	await import("./common/moderation/logging.js").then(({ default: log }) =>
		log(`🤖 Bot restarted on version **v${pkg.version}**!`, "server"),
	);

const usersVc = await guild.channels.fetch(process.env.USERS_CHANNEL || "");
if (!usersVc) throw new TypeError("Could not find USERS_CHANNEL");

setInterval(async () => {
	const count = (
		await fetch(`https://scratchaddons.com/usercount.json?date=${Date.now()}`).then(
			(res) =>
				/** @type {Promise<{ count: number; _chromeCountDate: string }>} */ (res.json()),
		)
	).count;
	await usersVc.edit({ name: `👥 ${count.toLocaleString()} SA Users!` });
}, 300_000);

const guilds = await client.guilds.fetch();
guilds.forEach(async (guild) => {
	if (guild.id !== process.env.GUILD_ID)
		await client.application.commands.set([], guild.id).catch(() => {});
});

const dirname = path.dirname(url.fileURLToPath(import.meta.url));
const commands =
	await /** @type {Promise<import("discord.js").Collection<string, () => Promise<import("./types/command").default>>>} */ (
		importScripts(path.resolve(dirname, "./commands"))
	);

const [dmCommands, serverCommands] = await commands.reduce(
	async (promise, commandPromise, name) => {
		const [dmCommands, serverCommands] = await promise;
		const command = await commandPromise();
		if (command.enable === false) return [dmCommands, serverCommands];

		if (command.data.name)
			throw new AssertionError({
				actual: command.data.name,
				expected: "",
				operator: name,
				message: "Don’t manually set the command name, it will use the file name",
			});

		command.data.setName(name);

		const json = command.data.toJSON();

		if (typeof json.dm_permission !== "undefined")
			throw new AssertionError({
				actual: json.dm_permission,
				expected: undefined,
				message: "Don’t set DM permissions, set `dm: true` instead",
			});

		(command.dm && process.env.NODE_ENV === "production" ? dmCommands : serverCommands).push(
			json,
		);

		return [dmCommands, serverCommands];
	},
	/**
	 * @type {import("discord.js").Awaitable<
	 * 	[import("discord.js").RESTPostAPIApplicationCommandsJSONBody[], import("discord.js").RESTPostAPIApplicationCommandsJSONBody[]]
	 * >}
	 */ ([[], []]),
);

await Promise.all([
	client.application.commands.set(dmCommands),
	client.application.commands.set(serverCommands, process.env.GUILD_ID || ""),
]);
