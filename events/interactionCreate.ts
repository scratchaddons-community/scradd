import path from "node:path";
import url from "node:url";

import {
	ApplicationCommandType,
	type CommandInteractionOption,
	GuildMember,
	type Collection,
} from "discord.js";

import CONSTANTS from "../common/CONSTANTS.js";
import censor, { badWordsAllowed } from "../common/language.js";
import warn from "../common/punishments.js";
import { importScripts } from "../util/files.js";
import logError from "../util/logError.js";

import type Command from "../common/types/command.js";
import type Event from "../common/types/event";
import type { BaseCommand } from "../common/types/command.js";

/**
 * Detect bad words in command options.
 *
 * @param options The options to scan.
 *
 * @returns The scan results.
 */
function censorOptions(options: readonly CommandInteractionOption[]) {
	let strikes = 0;
	let isBad = false;
	const words: string[] = [];

	for (const option of options) {
		if (typeof option.value === "string") {
			const censored = censor(option.value);
			if (censored) {
				isBad = true;
				strikes += censored.strikes;
				words.push(option.value);
			}
		}
		if (option.options) {
			const censored = censorOptions(option.options);
			if (censored.isBad) {
				isBad = true;
				strikes += censored.strikes;
				words.push(...censored.words);
			}
		}
	}

	return { isBad, strikes, words };
}

const dirname = path.dirname(url.fileURLToPath(import.meta.url));

const unloadedCommands: Promise<Collection<string, Command>> = importScripts(
	path.resolve(dirname, "../commands"),
);

const event: Event<"interactionCreate"> = async function event(interaction) {
	const commands = await unloadedCommands;
	if (interaction.isAutocomplete()) {
		if (!interaction.inGuild()) throw new TypeError("Used command in DM");
		const command = commands.get(interaction.command?.name ?? "");

		if (!command || !("autocomplete" in command)) {
			throw new ReferenceError(
				`Command \`${interaction.command?.name}\` autocomplete handler not found`,
			);
		}

		return command.autocomplete?.(interaction);
	}
	try {
		if (!interaction.isCommand()) {
			const [id, name] = interaction.customId.split(/(?<=^[^_]*)_/);
			if (!name) return;

			if (interaction.isButton()) await get("buttons")?.(interaction, id);
			else if (interaction.isModalSubmit()) await get("modals")?.(interaction, id);
			else if (interaction.isStringSelectMenu())
				await get("stringSelects")?.(interaction, id);
			else if (interaction.isUserSelectMenu()) await get("userSelects")?.(interaction, id);
			else if (interaction.isRoleSelectMenu()) await get("roleSelects")?.(interaction, id);
			else if (interaction.isMentionableSelectMenu())
				await get("mentionableSelects")?.(interaction, id);
			else if (interaction.isChannelSelectMenu())
				await get("channelSelects")?.(interaction, id);

			function get<T extends keyof BaseCommand>(
				type: T,
			): NonNullable<NonNullable<Command>[T]>[string] | undefined;

			function get(type: keyof BaseCommand) {
				return commands.find((command) => !!command?.[type]?.[name ?? ""])?.[type]?.[
					name ?? ""
				];
			}

			return;
		}
		if (!interaction.inGuild()) throw new TypeError("Used command in DM");

		const command = commands.get(
			(!interaction.command || interaction.command.type === ApplicationCommandType.ChatInput
				? interaction.command?.name
				: interaction.command.name
						.split(" ")
						.map((word) => word.toLowerCase())
						.join("-")) ?? "",
		);

		if (!command)
			throw new ReferenceError(`Command \`${interaction.command?.name}\` not found`);

		if (
			interaction.isChatInputCommand() &&
			(command.data.censored === "channel"
				? !badWordsAllowed(interaction.channel)
				: command.data.censored ?? true)
		) {
			const censored = censorOptions(interaction.options.data);

			if (censored.isBad) {

				await	interaction.reply({
						ephemeral: true,
						content: `${CONSTANTS.emojis.statuses.no} Language!`,
					})
				await	warn(
						interaction.member instanceof GuildMember
							? interaction.member
							: interaction.user,
						"Watch your language!",
						censored.strikes,
						`Used command:\n${interaction.toString()}`,
					)
				return;
			}
		}

		// @ts-expect-error TS2345 -- No concrete fix to this
		await command.interaction(interaction);
	} catch (error) {
		await logError(
			error,
			interaction.isCommand()
				? interaction.isChatInputCommand()
					? interaction.toString()
					: `/${interaction.command?.name}`
				: `${interaction.constructor.name}: ${interaction.customId}`,
		);
		if (interaction.deferred && Number(interaction.createdAt) - Date.now() < 900_000) {
			return await interaction.editReply({
				content: `${CONSTANTS.emojis.statuses.no} An error occurred.`,
				embeds: [],
				components: [],
				files: [],
			});
		}

		if (!interaction.replied && Number(interaction.createdAt) - Date.now() > 3000) return;

		await interaction[interaction.replied ? "followUp" : "reply"]({
			ephemeral: true,
			content: `${CONSTANTS.emojis.statuses.no} An error occurred.`,
		});
	}
};

export default event;
