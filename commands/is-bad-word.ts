import { SlashCommandBuilder, escapeMarkdown } from "discord.js";
import CONSTANTS from "../common/CONSTANTS.js";
import { censor } from "../common/moderation/automod.js";
import type { ChatInputCommand } from "../common/types/command.js";
import { joinWithAnd } from "../lib/text.js";

const info: ChatInputCommand = {
	data: new SlashCommandBuilder()
		.setDescription("Checks text for language")
		.addStringOption((input) =>
			input.setName("text").setRequired(true).setDescription("Text to check"),
		),

	async interaction(interaction) {
		const result = censor(interaction.options.getString("text", true));
		if (result) {
			const words = result.words.flat();
			await interaction.reply({
				ephemeral: true,
				content:
					`⚠ **${words.length} bad word${words.length ? "s" : ""} detected**!\n` +
					`Posting that text would give you **${result.strikes} strike${
						result.strikes === 1 ? "" : "s"
					}**, ${result.strikes ? "so don’t" : "but please don’t still"}.\n\n` +
					"**I detected the following words as bad**: " +
					joinWithAnd(words, (word) => "*" + escapeMarkdown(word) + "*"),
			});
		} else
			await interaction.reply({
				ephemeral: true,
				content: CONSTANTS.emojis.statuses.yes + " No bad words found.",
			});
	},

	censored: false,
};
export default info;
