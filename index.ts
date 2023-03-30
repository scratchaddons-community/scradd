import path from "node:path";
import url from "node:url";
import dns from "node:dns";

import {
	PermissionsBitField,
	ApplicationCommandType,
	type ApplicationCommandData,
	ApplicationCommandOptionType,
	type ApplicationCommandAutocompleteNumericOptionData,
	type ApplicationCommandAutocompleteStringOptionData,
	type ApplicationCommandChannelOptionData,
	type ApplicationCommandNonOptionsData,
	type ApplicationCommandNumericOptionData,
	type ApplicationCommandStringOptionData,
	type Collection,
	ActivityType,
} from "discord.js";
import dotenv from "dotenv";

import pkg from "./package.json" assert { type: "json" };
import { importScripts } from "./util/files.js";

import type Command from "./common/types/command.js";
import type { Option } from "./common/types/command.js";
import type Event from "./common/types/event.js";
import type { ClientEvent } from "./common/types/event.js";

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

const { default: CONSTANTS } = await import("./common/CONSTANTS.js");

const dirname = path.dirname(url.fileURLToPath(import.meta.url));

/**
 * Convert our custom options format to something the Discord API will accept.
 *
 * @param options - The options to convert.
 *
 * @returns The converted options.
 */
function transformOptions(options: { [key: string]: Option }) {
	return Object.entries(options)
		.map(([name, option]) => {
			const transformed = {
				name,
				description: option.description,
				type: option.type,
				required: option.required ?? false,
			} as any;

			if (option.autocomplete) transformed.autocomplete = option.autocomplete;
			if (option.choices)
				transformed.choices = Object.entries(option.choices).map(([value, choice]) => ({
					name: choice,
					value,
				}));

			if (option.channelTypes) transformed.channelTypes = option.channelTypes;
			if (option.maxLength !== undefined) transformed.maxLength = option.maxLength;
			if (option.minLength !== undefined) transformed.minLength = option.minLength;

			if (option.maxValue !== undefined) transformed.maxValue = option.maxValue;
			if (option.minValue !== undefined) transformed.minValue = option.minValue;

			return transformed as
				| ApplicationCommandAutocompleteNumericOptionData
				| ApplicationCommandAutocompleteStringOptionData
				| ApplicationCommandChannelOptionData
				| ApplicationCommandNonOptionsData
				| ApplicationCommandNumericOptionData
				| ApplicationCommandStringOptionData;
		})
		.sort((one, two) =>
			one.required === two.required
				? two.name.localeCompare(one.name)
				: one.required
				? -1
				: 1,
		);
}

await importScripts(path.resolve(dirname, "./events")).then(
	(events: Collection<ClientEvent, Event>) => {
		for (const [event, execute] of events.entries()) {
			client.on(event, async (...args) => {
				try {
					await execute(...args);
				} catch (error) {
					await logError(error, event);
				}
			});
		}
	},
);
await importScripts(path.resolve(dirname, "./commands")).then(
	async (commands: Collection<string, Command>) => {
		await client.application.commands.set(
			commands
				.filter((command): command is NonNullable<typeof command> => command !== undefined)
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

						options: data.options
							? transformOptions(data.options)
							: data.subcommands &&
							  Object.entries(data.subcommands).map(([subcommand, command]) => ({
									description: command.description,
									name: subcommand,

									options: command.options && transformOptions(command.options),

									type: ApplicationCommandOptionType.Subcommand,
							  })),

						defaultMemberPermissions: data.restricted
							? new PermissionsBitField()
							: null,
					};
				}),
			CONSTANTS.guild.id,
		);
	},
);
await client.guilds.fetch().then(
	async (guilds) =>
		await Promise.all(
			guilds.map(async (otherGuild) => {
				if (otherGuild.id !== CONSTANTS.guild.id)
					await client.application.commands.set([], otherGuild.id).catch(() => {});
			}),
		),
);

if (process.env.NODE_ENV === "production") await import("./web/server.js");

if (process.env.NODE_ENV === "production") {
	const { default: log } = await import("./common/logging.js");
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
