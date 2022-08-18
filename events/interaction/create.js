import { GuildMember } from "discord.js";
import warn from "../../common/moderation/warns.js";
import { censor, badWordsAllowed } from "../../common/moderation/automod.js";
import { getWarns } from "../../commands/view-warns.js";
import CONSTANTS from "../../common/CONSTANTS.js";
import logError from "../../lib/logError.js";

import { importScripts } from "../../lib/files.js";
import path from "path";
import url from "url";
import { guessAddon } from "../../commands/guess-addon.js";

const dirname = path.dirname(url.fileURLToPath(import.meta.url));

const commands =
	await /** @type {Promise<import("discord.js").Collection<string, () => Promise<import("../../types/command").default>>>} */ (
		importScripts(path.resolve(dirname, "../../commands"))
	);

/** @type {import("../../types/event").default<"interactionCreate">} */
export default async function event(interaction) {
	if (
		interaction.isButton() &&
		interaction.customId.endsWith("_strike") &&
		interaction.member instanceof GuildMember
	) {
		await getWarns(
			(data) => interaction.reply(data),
			interaction.customId.split("_strike")[0] ?? null,
			interaction.member,
		);
		return;
	}
	if (interaction.isModalSubmit()) {
		if (interaction.customId.startsWith("guessModal.")) {
			return await guessAddon(interaction);
		}
	}
	if (!interaction.isChatInputCommand()) return;
	try {
		const commandPromise = commands.get(interaction.commandName);

		if (!commandPromise) throw new ReferenceError(`Command \`${interaction.commandName}\` not found.`);

		const command = await commandPromise();
		if (
			command.censored === "channel"
				? !badWordsAllowed(interaction.channel)
				: command.censored ?? true
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
		/** @type {string[]} */ words = [];
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
