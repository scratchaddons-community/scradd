import { ApplicationCommandOptionType, escapeMarkdown } from "discord.js";
import CONSTANTS from "../common/CONSTANTS.js";
import { censor } from "../common/automod.js";
import { defineCommand } from "../common/types/command.js";
import { joinWithAnd } from "../util/text.js";

const command = defineCommand({
	data: {
		description: "Checks text for language",
		options: {
			text: {
				type: ApplicationCommandOptionType.String,
				description: "Text to check",
				required: true,
			},
		},
		censored: false,
	},

	async interaction(interaction) {
		const result = censor(interaction.options.getString("text", true));

		const words = result && result.words.flat();
		await interaction.reply({
			ephemeral: true,
			content: words
				? `⚠ **${words.length} bad word${words.length ? "s" : ""} detected**!\n` +
				  "**I detected the following words as bad**: " +
				  joinWithAnd(words, (word) => "*" + escapeMarkdown(word) + "*")
				: CONSTANTS.emojis.statuses.yes + " No bad words found.",
		});
	},
});
export default command;
