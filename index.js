import { AssertionError } from "assert";
import path from "path";
import url from "url";

import { ActivityType } from "discord.js";
import dotenv from "dotenv";

import { importScripts, pkg } from "./lib/files.js";
import fetch from "node-fetch";
import { asyncFilter } from "./lib/promises.js";

dotenv.config();
const { default: client } = await import("./client.js");
const { default: logError } = await import("./lib/logError.js");

process
	.on("uncaughtException", (err, origin) => logError(err, origin))
	.on("warning", (err) => logError(err, "warning"));

client.user.setPresence({
	activities: [
		{
			name: process.env.NODE_ENV === "production" ? "the SA server!" : "for bugs…",
			type: ActivityType.Watching,
			url: pkg.homepage,
		},
	],
});

if (process.env.NODE_ENV === "production")
	await import("./common/moderation/logging.js").then(({ default: log }) =>
		log(`🤖 Bot restarted on version **v${pkg.version}**!`, "server"),
	);

const { default: CONSTANTS } = await import("./common/CONSTANTS.js");
CONSTANTS.channels.usersVc &&
	setInterval(async () => {
		const count = (
			await fetch(`https://scratchaddons.com/usercount.json?date=${Date.now()}`).then(
				(res) =>
					/** @type {Promise<{ count: number; _chromeCountDate: string }>} */ (
						res.json()
					),
			)
		).count;
		await CONSTANTS.channels.usersVc?.edit({ name: `👥 ${count.toLocaleString()} SA Users!` });
	}, 300_000);

const guilds = await client.guilds.fetch();
guilds.forEach(async (guild) => {
	if (guild.id !== process.env.GUILD_ID)
		await client.application.commands.set([], guild.id).catch(() => {});
});

const dirname = path.dirname(url.fileURLToPath(import.meta.url));

/** @type {import("discord.js").RESTPostAPIApplicationCommandsJSONBody[]} */
const commands = [];

for await (const entry of asyncFilter(
	[
		...(
			await /** @type {Promise<import("discord.js").Collection<string, () => Promise<import("./types/command").default>>>} */ (
				importScripts(path.resolve(dirname, "./commands"))
			)
		).entries(),
	],
	async ([name, commandPromise]) => {
		const command = await commandPromise();
		if (!command) return false;
		if (command.data.name)
			throw new AssertionError({
				actual: command.data.name,
				expected: "",
				operator: name,
				message: "Don’t manually set the command name, it will use the file name",
			});

		command.data.setName(name);

		const json = command.data.toJSON();

		if (json.dm_permission !== undefined)
			throw new AssertionError({
				actual: json.dm_permission,
				expected: undefined,
				operator: "!==",
				message: "Don’t set DM permissions, all commands are server commands",
			});

		return json;
	},
))
	commands.push(entry);

await client.application.commands.set(commands, process.env.GUILD_ID || "");
