import path from "path";
import url from "url";

import {
	ApplicationCommandType,
	type CommandInteractionOption,
	GuildMember,
	User,
	type Collection,
} from "discord.js";

import client from "../client.js";
import { edit } from "../commands/edit-message.js";
import { guessAddon } from "../commands/guess-addon.js";
import { say } from "../commands/say.js";
import CONSTANTS from "../common/CONSTANTS.js";
import censor, { badWordsAllowed } from "../common/language.js";
import log from "../common/logging.js";
import warn, { filterToStrike, getStrikeById, strikeDatabase } from "../common/punishments.js";
import giveXp, { DEFAULT_XP } from "../common/xp.js";
import { importScripts } from "../util/files.js";
import logError from "../util/logError.js";

import type Command from "../common/types/command.js";
import type Event from "../common/types/event";

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

const commands: Promise<Collection<string, Command>> = importScripts(
	path.resolve(dirname, "../commands"),
);

const event: Event<"interactionCreate"> = async function event(interaction) {
	if (interaction.isAutocomplete()) {
		if (!interaction.inGuild()) throw new TypeError("Used command in DM");
		const command = (await commands).get(interaction.command?.name ?? "");

		if (!command || !("autocomplete" in command)) {
			throw new ReferenceError(
				`Command \`${interaction.command?.name}\` autocomplete handler not found`,
			);
		}

		return command.autocomplete?.(interaction);
	}
	try {
		if (interaction.isButton()) {
			const [id, type] = interaction.customId.split(/(?<=^[^_]*)_/);
			switch (type) {
				case "strike": {
					if (!(interaction.member instanceof GuildMember))
						throw new TypeError("interaction.member is not a GuildMember");

					await interaction.reply(await getStrikeById(interaction.member, id ?? ""));
					return;
				}

				case "remove_strike": {
					const strike = id && (await filterToStrike(id));
					if (!strike) {
						return await interaction.reply({
							ephemeral: true,
							content: `${CONSTANTS.emojis.statuses.no} Invalid strike ID!`,
						});
					}

					if (strike.removed) {
						return await interaction.reply({
							ephemeral: true,
							content: `${CONSTANTS.emojis.statuses.no} That strike was already removed!`,
						});
					}

					strikeDatabase.data = strikeDatabase.data.map((toRemove) =>
						id === toRemove.id ? { ...toRemove, removed: true } : toRemove,
					);
					const user =
						(await client.users.fetch(strike.user).catch(() => {})) ||
						`<@${strike.user}>`;
					await interaction.reply(
						`${
							CONSTANTS.emojis.statuses.yes
						} Removed strike \`${id}\` from ${user.toString()}!`,
					);
					const member = await CONSTANTS.guild.members.fetch(strike.user).catch(() => {});
					if (
						member?.communicationDisabledUntil &&
						Number(member.communicationDisabledUntil) > Date.now()
					)
						await member.disableCommunicationUntil(Date.now());
					const { url: logUrl } = await log(
						`${CONSTANTS.emojis.statuses.yes} ${
							interaction.member
						} removed strike \`${id}\` from ${user.toString()}!`,
						"members",
					);
					if (user instanceof User) await giveXp(user, logUrl, strike.count * DEFAULT_XP);
					if (typeof user === "object") {
						await user.send(
							`${CONSTANTS.emojis.statuses.yes} Your strike \`${id}\` was removed!`,
						);
					}
				}
			}
		}
		if (interaction.isModalSubmit()) {
			if (interaction.customId.startsWith("guessModal.")) {
				await guessAddon(interaction);
				return;
			}

			if (interaction.customId === "say") {
				await say(interaction, interaction.fields.getTextInputValue("message"));
				return;
			}

			if (interaction.customId.startsWith("edit.")) {
				await edit(interaction);
				return;
			}
		}
		if (interaction.isStringSelectMenu() && interaction.customId === "selectStrike") {
			if (!(interaction.member instanceof GuildMember))
				throw new TypeError("interaction.member is not a GuildMember");

			const [id] = interaction.values;
			if (id) return await interaction.reply(await getStrikeById(interaction.member, id));
		}

		if (!interaction.isCommand()) return;
		if (!interaction.inGuild()) throw new TypeError("Used command in DM");

		const command = (await commands).get(
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
				await Promise.all([
					interaction.reply({
						ephemeral: true,
						content: `${CONSTANTS.emojis.statuses.no} Language!`,
					}),
					warn(
						interaction.member instanceof GuildMember
							? interaction.member
							: interaction.user,
						"Watch your language!",
						censored.strikes,
						`Used command:\n${interaction.toString()}`,
					),
				]);
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
