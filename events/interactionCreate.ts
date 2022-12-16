import { CommandInteractionOption, GuildMember } from "discord.js";
import warn, { strikeDatabase } from "../common/warn.js";
import { censor, badWordsAllowed } from "../common/automod.js";
import { getStrikeById } from "../commands/strikes.js";
import CONSTANTS from "../common/CONSTANTS.js";
import logError from "../util/logError.js";

import { importScripts } from "../util/files.js";
import path from "path";
import url from "url";
import { guessAddon } from "../commands/guess-addon.js";
import { say } from "../commands/say.js";
import { edit } from "../commands/Edit Message.js";
import type Event from "../common/types/event";
import type Command from "../common/types/command.js";
import log from "../common/logging.js";
import client from "../client.js";

const dirname = path.dirname(url.fileURLToPath(import.meta.url));

const commands = importScripts<Command>(path.resolve(dirname, "../commands"));

const event: Event<"interactionCreate"> = async function event(interaction) {
	if (interaction.isAutocomplete()) {
		if (!interaction.inGuild()) throw new TypeError(`Used command in DM`);
		const command = (await commands).get(interaction.command?.name || "");

		if (!command || !("autocomplete" in command))
			throw new ReferenceError(
				`Command \`${interaction.command?.name}\` autocomplete handler not found`,
			);

		return await command.autocomplete?.(interaction);
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

				case "reaction_role": {
					if (!(interaction.member instanceof GuildMember))
						throw new TypeError("interaction.member is not a GuildMember");

					if (!id)
						throw new SyntaxError(
							"Button customId ends in _reaction_role but no role ID was given",
						);
					const role = interaction.member.roles.resolve(id);
					if (role) {
						await interaction.member.roles.remove(role, "Self role");
						await interaction.reply({
							ephemeral: true,
							content: `${
								CONSTANTS.emojis.statuses.yes
							} Removed ${role.toString()} from you!`,
						});
					} else {
						await interaction.member.roles.add(id, "Self role");
						await interaction.reply({
							ephemeral: true,
							content: `${CONSTANTS.emojis.statuses.yes} Gave you <@&${id}>!`,
						});
					}
					return;
				}

				case "remove_strike": {
					const strike = strikeDatabase.data.find((strike) => strike.id === id);
					if (!strike)
						return interaction.reply({
							ephemeral: true,
							content: `${CONSTANTS.emojis.statuses.no} Invalid strike ID!`,
						});

					if (strike.removed)
						return interaction.reply({
							ephemeral: true,
							content: `${CONSTANTS.emojis.statuses.no} That strike was already removed!`,
						});

					strikeDatabase.data = strikeDatabase.data.map((strike) =>
						id === strike.id ? { ...strike, removed: true } : strike,
					);
					const user =
						(await client.users.fetch(strike.user).catch(() => {})) ||
						`<@${strike.user}>`;
					await interaction.reply(
						`${
							CONSTANTS.emojis.statuses.yes
						} Removed strike \`${id}\` from ${user.toString()}!`,
					);
					if (
						interaction.member instanceof GuildMember &&
						interaction.member.communicationDisabledUntil &&
						+interaction.member.communicationDisabledUntil > Date.now()
					)
						interaction.member.disableCommunicationUntil(Date.now());
					await log(
						`${CONSTANTS.emojis.statuses.yes} ${
							interaction.member
						} removed strike \`${id}\` from ${user.toString()}!`,
						"members",
					);
					if (typeof user === "object")
						await user.send(
							`${CONSTANTS.emojis.statuses.yes} Your strike \`${id}\` was removed!`,
						);
				}
			}
		}
		if (interaction.isModalSubmit()) {
			if (interaction.customId.startsWith("guessModal."))
				return await guessAddon(interaction);

			if (interaction.customId === "say")
				return await say(interaction, interaction.fields.getTextInputValue("message"));

			if (interaction.customId.startsWith("edit.")) return await edit(interaction);
		}
		if (interaction.isStringSelectMenu()) {
			if (interaction.customId === "selectStrike") {
				if (!(interaction.member instanceof GuildMember))
					throw new TypeError("interaction.member is not a GuildMember");

				const id = interaction.values[0];
				if (id) return await interaction.reply(await getStrikeById(interaction.member, id));
			}
		}

		if (!interaction.isCommand()) return;
		if (!interaction.inGuild()) throw new TypeError(`Used command in DM`);

		const command = (await commands).get(interaction.command?.name || "");

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
						`Watch your language!`,
						censored.strikes,
						`Used command:\n${interaction.toString()}`,
					),
				]);
				return;
			}
		}

		// @ts-expect-error -- No concrete fix to this
		await command.interaction(interaction);
	} catch (error) {
		logError(
			error,
			interaction.isCommand()
				? interaction.isChatInputCommand()
					? interaction.toString()
					: `/${interaction.command?.name}`
				: `${interaction.constructor.name}: ${interaction.customId}`,
		);
		if (interaction.deferred && +interaction.createdAt - Date.now() < 900_000) {
			return await interaction.editReply({
				content: `${CONSTANTS.emojis.statuses.no} An error occurred.`,
				embeds: [],
				components: [],
				files: [],
			});
		}

		if (!interaction.replied && +interaction.createdAt - Date.now() > 3_000) return;

		await interaction[interaction.replied ? "followUp" : "reply"]({
			ephemeral: true,
			content: `${CONSTANTS.emojis.statuses.no} An error occurred.`,
		});
	}
};

function censorOptions(options: readonly CommandInteractionOption[]) {
	let strikes = 0,
		isBad = false,
		words: string[] = [];
	options.forEach((option) => {
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
	});

	return { isBad, strikes, words };
}
export default event;
