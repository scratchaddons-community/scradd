import http from "node:http";
import path from "path";
import url from "url";

import {
	type Snowflake,
	PermissionsBitField,
	ApplicationCommandType,
	type ApplicationCommandData,
	ApplicationCommandOptionType,
} from "discord.js";
import dotenv from "dotenv";

import pkg from "./package.json" assert { type: "json" };
import { importScripts } from "./util/files.js";

import type Command from "./common/types/command.js";
import type { Option } from "./common/types/command.js";
import type { default as Event, ClientEvent } from "./common/types/event.js";

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

const dirname = path.dirname(url.fileURLToPath(import.meta.url));

function transformOptions(options: { [key: string]: Option }) {
	return Object.entries(options).map(([name, option]) => ({
		name,
		description: option.description,
		required: option.required ?? false,
		minValue: option.min,
		maxValue: option.max,
		type: option.type,
		channelTypes: option.channelTypes,
		maxLength: option.maxLength,
		minLength: option.minLength,
		autocomplete: option.autocomplete,

		...(option.choices
			? {
					type: option.type,

					choices: Object.entries(option.choices).map(([value, name]) => ({
						name,
						value,
					})),
			  }
			: {}),
	}));
}

const promises = [
	importScripts<Event, ClientEvent>(path.resolve(dirname, "./events")).then((events) => {
		for (const [event, execute] of events.entries()) {
			client.on(event, async (...arguments_) => {
				try {
					await execute(...arguments_);
				} catch (error) {
					logError(error, event);
				}
			});
		}
	}),
	importScripts<Command>(path.resolve(dirname, "./commands")).then((commands) => {
		client.application.commands.set(
			commands
				.filter((command): command is NonNullable<typeof command> => Boolean(command))
				.map(({ data }, name): ApplicationCommandData => {
					const type = data.type ?? ApplicationCommandType.ChatInput;
					return {
						name:
							type === ApplicationCommandType.ChatInput
								? name
								: name
										.split("-")
										.map(
											(word) => (word[0] ?? "").toUpperCase() + word.slice(1),
										)
										.join(" "),

						description: data.description ?? "",
						type,

						defaultMemberPermissions: data.restricted
							? new PermissionsBitField()
							: null,

						options: data.options
							? transformOptions(data.options)
							: data.subcommands &&
							  Object.entries(data.subcommands).map(([name, subcommand]) => ({
									name,
									description: subcommand.description,

									options:
										subcommand.options && transformOptions(subcommand.options),

									type: ApplicationCommandOptionType.Subcommand,
							  })),
					};
				}),
			CONSTANTS.guild.id,
		);
	}),
	client.guilds.fetch().then(
		async (guilds) =>
			await Promise.all(
				guilds.map(async (otherGuild) => {
					if (otherGuild.id !== CONSTANTS.guild.id)
						await client.application.commands.set([], otherGuild.id).catch(() => {});
				}),
			),
	),
];

setInterval(async () => {
	const { count } = await fetch(`${CONSTANTS.urls.usercountJson}?date=${Date.now()}`).then(
		async (res) => await (res.json() as Promise<{ count: number; _chromeCountDate: string }>),
	);
	await CONSTANTS.channels.info?.setName(
		`Info - ${CONSTANTS.guild.memberCount.toLocaleString([], {
			maximumFractionDigits: 2,
			minimumFractionDigits: CONSTANTS.guild.memberCount > 999 ? 2 : 0,
			notation: "compact",
			compactDisplay: "short",
		})} members`,
		"Automated update to sync count",
	);
	await CONSTANTS.channels.SA?.setName(
		`Scratch Addons - ${count.toLocaleString([], {
			maximumFractionDigits: 1,
			minimumFractionDigits: count > 999 ? 1 : 0,
			notation: "compact",
			compactDisplay: "short",
		})} users`,
		"Automated update to sync count",
	);
}, 300_000);

if (process.env.NODE_ENV === "production") {
	const { cleanDatabaseListeners } = await import("./common/database.js");
	http.createServer(async (request, response) => {
		const url = new URL(request.url || "", `https://${request.headers.host}`);

		if (
			url.pathname === "/cleanDatabaseListeners" &&
			url.searchParams.get("auth") === process.env.CDBL_AUTH
		) {
			process.emitWarning("cleanDatabaseListeners called");
			await cleanDatabaseListeners();
			process.emitWarning("cleanDatabaseListeners ran");
			response.writeHead(200, { "Content-Type": "text/plain" }).end("Success");
		} else {
			response.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
		}
	}).listen(process.env.PORT ?? 443);
}

await Promise.all(promises);
if (process.env.NODE_ENV === "production") {
	const { default: log } = await import("./common/logging.js");
	await log(`🤖 Bot restarted on version **v${pkg.version}**!`, "server");
}

const { default: logError } = await import("./util/logError.js");

process
	.on("uncaughtException", async (error, origin) => await logError(error, origin))
	.on("warning", async (error) => await logError(error, "warning"));
