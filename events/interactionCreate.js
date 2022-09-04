import { ApplicationCommandType, GuildMember } from "discord.js";
import warn from "../common/moderation/warns.js";
import { censor, badWordsAllowed } from "../common/moderation/automod.js";
import { getWarns } from "../commands/view-warns.js";
import CONSTANTS from "../common/CONSTANTS.js";
import logError from "../lib/logError.js";

import { importScripts } from "../lib/files.js";
import path from "path";
import url from "url";
import { guessAddon } from "../commands/guess-addon.js";

const dirname = path.dirname(url.fileURLToPath(import.meta.url));

const commands = await /** @type {typeof importScripts<import("../common/types/command").default>} */
	(importScripts)(path.resolve(dirname, "../commands"));

/** @type {import("../common/types/event").default<"interactionCreate">} */
export default async function event(interaction) {
	if (interaction.isButton()) {
		if (interaction.customId.endsWith("_strike")) {
			if (!(interaction.member instanceof GuildMember))
				throw new TypeError("interaction.member is not a GuildMember");

			await getWarns(
				(data) => interaction.reply(data),
				interaction.member,
				interaction.customId.split("_strike")[0],
			);
			return;
		}

		if (interaction.customId.endsWith("_reaction_role")) {
			if (!(interaction.member instanceof GuildMember))
				throw new TypeError("interaction.member is not a GuildMember");

			const roleId = interaction.customId.split("_reaction_role")[0];
			if (!roleId)
				throw new SyntaxError(
					"Button customId ends in _reaction_role but no role ID was given",
				);
			const role = interaction.member.roles.resolve(roleId);
			if (role) {
				await interaction.member.roles.remove(role);
				await interaction.reply({
					ephemeral: true,
					content: `${
						CONSTANTS.emojis.statuses.yes
					} Removed ${role.toString()} from you!`,
				});
			} else {
				await interaction.member.roles.add(roleId);
				await interaction.reply({
					ephemeral: true,
					content: `${CONSTANTS.emojis.statuses.yes} Gave you <@&${role}>!`,
				});
			}
			return;
		}
	}
	if (interaction.isModalSubmit()) {
		if (interaction.customId.startsWith("guessModal.")) {
			return await guessAddon(interaction);
		}
	}
	if (!interaction.isCommand()) return;
	try {
		const commandPromise = commands.get(interaction.commandName);

		const command = await commandPromise?.();

		if (!command) throw new ReferenceError(`Command \`${interaction.commandName}\` not found`);

		const commandType = command.data.toJSON().type;

		if (
			commandType === ApplicationCommandType.ChatInput &&
			("censored" in command && command.censored === "channel"
				? !badWordsAllowed(interaction.channel)
				: ("censored" in command && command.censored) ?? true)
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
						`Used command:\n/${interaction.commandName} ${stringifyOptions(
							interaction.options.data,
						)}`,
					),
				]);
				return;
			}
		}

		// @ts-expect-error -- No concrete fix to this
		await command.interaction(interaction);
	} catch (error) {
		await interaction[interaction.replied || interaction.deferred ? "editReply" : "reply"]({
			ephemeral: true,
			content: `${CONSTANTS.emojis.statuses.no} An error occurred.`,
			embeds: [],
			components: [],
			files: [],
		}).catch((error) => logError(error, "interactionCreate"));
		throw error;
	}
}

/**
 * @param {readonly import("discord.js").CommandInteractionOption[]} options
 *
 * @returns {string}
 */
function stringifyOptions(options) {
	return options
		.map((option) =>
			option.options
				? option.name + " " + stringifyOptions(option.options)
				: option.name + ": " + option.value,
		)
		.join(" ");
}
/** @param {readonly import("discord.js").CommandInteractionOption[]} options */
function censorOptions(options) {
	let strikes = 0,
		isBad = false,
		/** @type {string[]} */
		words = [];
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
