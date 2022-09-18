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
import http from "node:http";

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			GUILD_ID: string;
			BOT_TOKEN: string;
			NODE_ENV: "development" | "production";
			PORT?: `${number}`;
			CDBL_AUTH?: string;
		}
	}
}

dotenv.config();

const { default: client, guild } = await import("./client.js");
const { default: logError } = await import("./lib/logError.js");
const { cleanDatabaseListeners } = await import("./common/database.js");

process
	.on("uncaughtException", (err, origin) => logError(err, origin))
	.on("warning", (err) => logError(err, "warning"));

if (process.env.NODE_ENV === "production")
	await import("./common/moderation/logging.js").then(({ default: log }) =>
		log(`🤖 Bot restarted on version **v${pkg.version}**!`, "server"),
	);

const { default: CONSTANTS } = await import("./common/CONSTANTS.js");

setInterval(async () => {
	const count = (
		await fetch(`${CONSTANTS.urls.usercountJson}?date=${Date.now()}`).then(
			(res) => res.json() as Promise<{ count: number; _chromeCountDate: string }>,
		)
	).count;
	await CONSTANTS.channels.info?.edit({
		name: `📜 Info - ${count.toLocaleString([], {
			maximumFractionDigits: 2,
			notation: "compact",
			compactDisplay: "short",
		})} SA users!`,
	});
	await CONSTANTS.channels.chat?.edit({
		name: `💬 Chat - ${guild.memberCount.toLocaleString([], {
			maximumFractionDigits: 2,
			notation: "compact",
			compactDisplay: "short",
		})} members!`,
	});
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
	http.createServer(async function (request, response) {
		const url = new URL(request.url || "", `https://${request.headers.host}`);

		if (
			url.pathname === "/cleanDatabaseListeners" &&
			url.searchParams.get("auth") === process.env.CDBL_AUTH
		) {
			process.emitWarning("cleanDatabaseListeners called");
			await cleanDatabaseListeners();
			process.emitWarning("cleanDatabaseListeners ran");
			response.writeHead(200, { "Content-Type": "text/plain" }).end("Success");
		} else response.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
	}).listen(process.env.PORT ?? 443);
