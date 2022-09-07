import { AssertionError } from "assert";
import path from "path";
import url from "url";

import dotenv from "dotenv";

import { importScripts } from "./lib/files.js";
import pkg from "./package.json" assert { type: "json" };
import fetch from "node-fetch";
import { asyncFilter } from "./lib/promises.js";
import type { RESTPostAPIApplicationCommandsJSONBody } from "discord.js";
import type Command from "./common/types/command";
import https from "node:https";
import { cleanDatabaseListeners } from "./common/database.js";

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			GUILD_ID: string;
			BOT_TOKEN: string;
			NODE_ENV: "development" | "production";
			PORT?: number;
		}
	}
}

dotenv.config();
const { default: client } = await import("./client.js");
const { default: logError } = await import("./lib/logError.js");

process
	.on("uncaughtException", (err, origin) => logError(err, origin))
	.on("warning", (err) => logError(err, "warning"));

if (process.env.NODE_ENV === "production")
	await import("./common/moderation/logging.js").then(({ default: log }) =>
		log(`🤖 Bot restarted on version **v${pkg.version}**!`, "server"),
	);

const { default: CONSTANTS } = await import("./common/CONSTANTS.js");

CONSTANTS.channels.users &&
	setInterval(async () => {
		const count = (
			await fetch(`${CONSTANTS.urls.usercountJson}?date=${Date.now()}`).then(
				(res) => res.json() as Promise<{ count: number; _chromeCountDate: string }>,
			)
		).count;
		await CONSTANTS.channels.users?.edit({ name: `👥 ${count.toLocaleString()} SA Users!` });
	}, 300_000);

const dirname = path.dirname(url.fileURLToPath(import.meta.url));

const commands: RESTPostAPIApplicationCommandsJSONBody[] = [];

for await (const entry of asyncFilter(
	[...(await importScripts<Command>(path.resolve(dirname, "./commands"))).entries()],
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

const guilds = await client.guilds.fetch();
guilds.forEach(async (guild) => {
	if (guild.id !== process.env.GUILD_ID)
		await client.application.commands.set([], guild.id).catch(() => {});
});

if (process.env.NODE_ENV === "production")
	https
		.createServer(async function (request, response) {
			const url = new URL(request.url || "", `http://${request.headers.host}`);

			if ((url.pathname = "/cleanDatabaseListeners")) {
				await cleanDatabaseListeners();
				response.writeHead(200, { "Content-Type": "text/plain" }).end("Success");
			}
			response.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
		})
		.listen(process.env.PORT ?? 443);
