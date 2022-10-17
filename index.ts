import { AssertionError } from "assert";
import path from "path";
import url from "url";

import dotenv from "dotenv";

import { importScripts } from "./util/files.js";
import pkg from "./package.json" assert { type: "json" };
import fetch from "node-fetch";
import { asyncFilter } from "./util/promises.js";
import type { RESTPostAPIApplicationCommandsJSONBody, Snowflake } from "discord.js";
import type Command from "./common/types/command";
import http from "node:http";

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			GUILD_ID: Snowflake;
			BOT_TOKEN: string;
			NODE_ENV: "development" | "production";
			PORT?: `${number}`;
			CDBL_AUTH?: string;
		}
	}
}

dotenv.config();

const { default: client } = await import("./client.js");
const { default: CONSTANTS } = await import("./common/CONSTANTS.js");
const { default: log } = await import("./common/moderation/logging.js");
const { default: logError } = await import("./util/logError.js");
const { cleanDatabaseListeners } = await import("./common/database.js");

process
	.on("uncaughtException", (err, origin) => logError(err, origin))
	.on("warning", (err) => logError(err, "warning"));

if (process.env.NODE_ENV === "production")
	log(`🤖 Bot restarted on version **v${pkg.version}**!`, "server");

setInterval(async () => {
	const count = (
		await fetch(`${CONSTANTS.urls.usercountJson}?date=${Date.now()}`).then(
			(res) => res.json() as Promise<{ count: number; _chromeCountDate: string }>,
		)
	).count;
	await CONSTANTS.channels.info?.setName(
		`📜 Info - ${count.toLocaleString([], {
			maximumFractionDigits: 1,
			minimumFractionDigits: count > 999 ? 1 : 0,
			notation: "compact",
			compactDisplay: "short",
		})} SA users!`,
		"Automated update to sync count",
	);
	await CONSTANTS.channels.chat?.setName(
		`💬 Chat - ${CONSTANTS.guild.memberCount.toLocaleString([], {
			maximumFractionDigits: 2,
			minimumFractionDigits: CONSTANTS.guild.memberCount > 999 ? 2 : 0,
			notation: "compact",
			compactDisplay: "short",
		})} members!`,
		"Automated update to sync count",
	);
}, 300_000);

const dirname = path.dirname(url.fileURLToPath(import.meta.url));

const commands: RESTPostAPIApplicationCommandsJSONBody[] = [];

for await (const entry of asyncFilter(
	[...(await importScripts<Command>(path.resolve(dirname, "./commands"))).entries()],
	async ([name, command]) => {
		if (!command) return false;

		if (command.data.dm_permission !== undefined)
			throw new AssertionError({
				actual: command.data.dm_permission,
				expected: undefined,
				operator: "!==",
				message: "Don’t set DM permissions, all commands are server commands",
			});

		return { ...command.data, name: name };
	},
))
	commands.push(entry);

await client.application.commands.set(commands, CONSTANTS.guild.id);

const guilds = await client.guilds.fetch();
guilds.forEach(async (otherGuild) => {
	if (otherGuild.id !== CONSTANTS.guild.id)
		await client.application.commands.set([], otherGuild.id).catch(() => {});
});

if (process.env.NODE_ENV === "production") {
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
}
