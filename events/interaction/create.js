import { GuildMember } from "discord.js";
import warn from "../../common/moderation/warns.js";
import { censor, badWordsAllowed } from "../../common/moderation/automod.js";
import fetchCommands from "../../common/commands.js";
import { getWarns } from "../../commands/view-warns.js";
import CONSTANTS from "../../common/CONSTANTS.js";

/** @type {import("../../types/event").default<"interactionCreate">} */
const event = {
	async event(interaction) {
		if (
			interaction.isButton() &&
			interaction.customId.endsWith("_strike") &&
			interaction.member instanceof GuildMember
		) {
			return await getWarns(
				(data) => interaction.reply(data),
				interaction.customId.split("_strike")[0] ?? null,
				interaction.member,
			);
		}
		if (!interaction.isCommand()) return;
		try {
			const command = (await fetchCommands(this)).get(interaction.commandName);

			if (!command)
				throw new ReferenceError(`Command \`${interaction.commandName}\` not found.`);

			if (
				command.censored === "channel"
					? !badWordsAllowed(interaction.channel)
					: command.censored ?? true
			) {
				const censored = censorOptions(interaction.options.data);

				if (censored.isBad) {
					await Promise.all([
						interaction.reply({ ephemeral: true, content: "Language!" }),
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

			await command.interaction(interaction);
		} catch (error) {
			await interaction[interaction.replied ? "editReply" : "reply"]({
				ephemeral: true,
				content: `${CONSTANTS.emojis.statuses.no} An error occurred.`,
				embeds: [],
				components: [],
				files: [],
			});
			throw error;
		}
	},
};

export default event;

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
