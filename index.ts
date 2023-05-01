import path from "node:path";
import url from "node:url";
import dns from "node:dns";
import fileSystem from "node:fs/promises";

import { ActivityType } from "discord.js";
import dotenv from "dotenv";

import pkg from "./package.json" assert { type: "json" };
import type { ClientEvent, Event } from "./events.js";
import { GlobalFonts } from "@napi-rs/canvas";

dotenv.config();
dns.setDefaultResultOrder("ipv4first");

const { default: client } = await import("./client.js");
const { default: logError } = await import("./util/logError.js");

process
	.on("uncaughtException", (error, origin) => {
		logError(error, origin).catch(console.error);
	})
	.on("warning", (error) => {
		logError(error, "warning").catch(console.error);
	});

GlobalFonts.registerFromPath(
	path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), `./common/sora/font.ttf`),
	"Sora",
);

const { default: CONSTANTS } = await import("./common/CONSTANTS.js");

const directory = path.resolve(url.fileURLToPath(import.meta.url), "./modules");
const modules = await fileSystem.readdir(directory);

const promises = modules.map(async (module) => {
	const fullPath = path.join(directory, module);
	const resolved = (await fileSystem.lstat(fullPath)).isDirectory()
		? path.join(fullPath, "./index.js")
		: fullPath;
	if (path.extname(resolved) !== ".js") return;

	await import(url.pathToFileURL(path.resolve(directory, resolved)).toString());
});
await Promise.all(promises);

const { events } = await import("./events.js");
for (const [event, execute] of Object.entries(events) as [ClientEvent, Event<ClientEvent>][]) {
	client.on(event, async (...args) => {
		try {
			await execute(...args);
		} catch (error) {
			await logError(error, event);
		}
	});
}

const { commandData } = await import("./commands.js");
await client.application.commands.set(commandData, CONSTANTS.guild.id);

await client.guilds.fetch().then(
	async (guilds) =>
		await Promise.all(
			guilds.map(async (otherGuild) => {
				if (otherGuild.id !== CONSTANTS.guild.id)
					await client.application.commands.set([], otherGuild.id).catch(() => {});
			}),
		),
);

if (process.env.NODE_ENV === "production") {
	await import("./web/server.js");

	const { default: log } = await import("./modules/modlogs/logging.js");
	await log(`🤖 Bot restarted on version **v${pkg.version}**!`, "server");
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
