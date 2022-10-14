import { ApplicationCommandOptionType, escapeMarkdown } from "discord.js";
import CONSTANTS from "../common/CONSTANTS.js";
import { censor } from "../common/moderation/automod.js";
import type { ChatInputCommand } from "../common/types/command.js";
import { joinWithAnd } from "../util/text.js";

const command: ChatInputCommand = {
	data: {
		description: "Checks text for language",
		options: [
			{
				type: ApplicationCommandOptionType.String,
				name: "text",
				description: "Text to check",
				required: true,
			},
		],
	},

	async interaction(interaction) {
		const result = censor(interaction.options.getString("text", true));

		const words = result && result.words.flat();
		await interaction.reply({
			ephemeral: true,
			content: words
				? `⚠ **${words.length} bad word${words.length ? "s" : ""} detected**!\n` +
				  `Posting that text would give you **${result.strikes} strike${
						result.strikes === 1 ? "" : "s"
				  }**, ${result.strikes ? "so don’t" : "but please don’t still"}.\n\n` +
				  "**I detected the following words as bad**: " +
				  joinWithAnd(words, (word) => "*" + escapeMarkdown(word) + "*")
				: CONSTANTS.emojis.statuses.yes + " No bad words found.",
		});
	},

	censored: false,
};
export default command;
