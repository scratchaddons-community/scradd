import { type CommandInteractionOption, GuildMember } from "discord.js";

import CONSTANTS from "../common/CONSTANTS.js";
import censor, { badWordsAllowed } from "../modules/automod/language.js";
import logError from "../util/logError.js";
import defineEvent from "../events.js";
import warn from "../modules/punishments/warn.js";
import { commands } from "../commands.js";
import { buttons, modals, selects } from "../components.js";
defineEvent("interactionCreate", async (interaction) => {
	if (interaction.isAutocomplete()) {
		if (!interaction.inGuild()) throw new TypeError("Used command in DM");
		const command = commands.get(interaction.command?.name ?? "");

		const { autocomplete } =
			command?.options?.[interaction.options.getFocused(true).name] ?? {};

		if (!autocomplete) {
			throw new ReferenceError(
				`Command \`${interaction.command?.name}\` autocomplete handler not found`,
			);
		}

		return autocomplete(interaction);
	}

	try {
		if (!interaction.isCommand()) {
			const [id, name] = interaction.customId.split(/(?<=^[^_]*)_/);
			if (!name) return;

			if (interaction.isButton()) await buttons[name]?.(interaction, id ?? "");
			else if (interaction.isModalSubmit()) await modals[name]?.(interaction, id ?? "");
			else if (interaction.isAnySelectMenu()) await selects[name]?.(interaction, id ?? "");

			return;
		}
		if (!interaction.inGuild()) throw new TypeError("Used command in DM");

		const command = commands.get(interaction.command?.name ?? "");

		if (!command)
			throw new ReferenceError(`Command \`${interaction.command?.name}\` not found`);

		if (
			interaction.isChatInputCommand() &&
			(command.censored === "channel"
				? !badWordsAllowed(interaction.channel)
				: command.censored ?? true)
		) {
			const censored = censorOptions(interaction.options.data);

			if (censored.isBad) {
				await interaction.reply({
					ephemeral: true,
					content: `${CONSTANTS.emojis.statuses.no} Language!`,
				});
				await warn(
					interaction.member instanceof GuildMember
						? interaction.member
						: interaction.user,
					"Watch your language!",
					censored.strikes,
					`Used command:\n${interaction.toString()}`,
				);
				return;
			}
		}

		// @ts-expect-error TS2345 -- No concrete fix to this
		await command.command(interaction);
	} catch (error) {
		await logError(
			error,
			interaction.isCommand()
				? interaction.isChatInputCommand()
					? interaction.toString()
					: `/${interaction.command?.name}`
				: `${interaction.constructor.name}: ${interaction.customId}`,
		);

		if (interaction.deferred || interaction.replied) {
			await interaction.followUp({
				ephemeral: true,
				content: `${CONSTANTS.emojis.statuses.no} An error occurred.`,
			});
		} else if (Number(interaction.createdAt) - Date.now() < 3000) {
			await interaction.reply({
				ephemeral: true,
				content: `${CONSTANTS.emojis.statuses.no} An error occurred.`,
			});
		}
	}
});

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
