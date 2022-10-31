import path from "path";
import url from "url";

import dotenv from "dotenv";

import { importScripts } from "./util/files.js";
import pkg from "./package.json" assert { type: "json" };
import fetch from "node-fetch";
import type { Snowflake } from "discord.js";
import type Command from "./common/types/command";
import http from "node:http";
import type { default as Event, ClientEvent } from "./common/types/event.js";
import type { ChatInputCommand, ContextMenuCommand } from "./common/types/command";

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
const { default: logError } = await import("./util/logError.js");

process
	.on("uncaughtException", (err, origin) => logError(err, origin))
	.on("warning", (err) => logError(err, "warning"));

const dirname = path.dirname(url.fileURLToPath(import.meta.url));

const promises = [
	importScripts<Event, ClientEvent>(path.resolve(dirname, "./events")).then((events) => {
		for (const [event, execute] of events.entries()) {
			client.on(event, async (...args) => {
				try {
					await execute(...args);
				} catch (error) {
					logError(error, event);
				}
			});
		}
	}),
	importScripts<Command>(path.resolve(dirname, "./commands")).then((commands) => {
		client.application.commands.set(
			commands
				.filter((command): command is ChatInputCommand | ContextMenuCommand => !!command)
				.map((command, name) => ({ ...command.data, name })),
			CONSTANTS.guild.id,
		);
	}),
	client.guilds.fetch().then((guilds) =>
		Promise.all(
			guilds.map(async (otherGuild) => {
				if (otherGuild.id !== CONSTANTS.guild.id)
					await client.application.commands.set([], otherGuild.id).catch(() => {});
			}),
		),
	),
];

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

if (process.env.NODE_ENV === "production") {
	const { cleanDatabaseListeners } = await import("./common/database.js");
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

await Promise.all([...promises]);
if (process.env.NODE_ENV === "production") {
	const { default: log } = await import("./common/logging.js");
	await log(`🤖 Bot restarted on version **v${pkg.version}**!`, "server");
}
