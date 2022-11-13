import { CommandInteractionOption, GuildMember } from "discord.js";
import warn from "../common/warns.js";
import { censor, badWordsAllowed } from "../common/automod.js";
import { getWarnById } from "../commands/view-warns.js";
import CONSTANTS from "../common/CONSTANTS.js";
import logError from "../util/logError.js";

import { importScripts } from "../util/files.js";
import path from "path";
import url from "url";
import { guessAddon } from "../commands/guess-addon.js";
import { say } from "../commands/say.js";
import type Event from "../common/types/event";
import type Command from "../common/types/command.js";

const dirname = path.dirname(url.fileURLToPath(import.meta.url));

const commands = importScripts<Command>(path.resolve(dirname, "../commands"));

const event: Event<"interactionCreate"> = async function event(interaction) {
	if (!interaction.inGuild()) throw new TypeError(`Used command in DM`);
	if (interaction.isAutocomplete()) {
		const command = (await commands).get(interaction.command?.name || "");

		if (!command || !("autocomplete" in command))
			throw new ReferenceError(
				`Command \`${interaction.command?.name}\` autocomplete handler not found`,
			);

		return await command.autocomplete?.(interaction);
	}
	if (!interaction.isRepliable()) return;
	try {
		if (interaction.isButton()) {
			if (interaction.customId.endsWith("_strike")) {
				if (!(interaction.member instanceof GuildMember))
					throw new TypeError("interaction.member is not a GuildMember");

				await interaction.reply(
					await getWarnById(
						interaction.member,
						interaction.customId.split("_strike")[0] ?? "",
					),
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
					await interaction.member.roles.remove(role, "Self role");
					await interaction.reply({
						ephemeral: true,
						content: `${
							CONSTANTS.emojis.statuses.yes
						} Removed ${role.toString()} from you!`,
					});
				} else {
					await interaction.member.roles.add(roleId, "Self role");
					await interaction.reply({
						ephemeral: true,
						content: `${CONSTANTS.emojis.statuses.yes} Gave you <@&${roleId}>!`,
					});
				}
				return;
			}
		}

		if (interaction.isModalSubmit()) {
			if (interaction.customId.startsWith("guessModal.")) {
				return await guessAddon(interaction);
			}
			if (interaction.customId === "say") {
				return await say(interaction, interaction.fields.getTextInputValue("message"));
			}
		}
		if (!interaction.isCommand()) return;

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
		if (interaction.deferred && +interaction.createdAt - +new Date() < 900_000) {
			return await interaction.editReply({
				content: `${CONSTANTS.emojis.statuses.no} An error occurred.`,
				embeds: [],
				components: [],
				files: [],
			});
		}

		if (!interaction.replied && +interaction.createdAt - +new Date() > 3_000) return;

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
