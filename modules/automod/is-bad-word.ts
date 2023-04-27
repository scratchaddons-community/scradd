import { ApplicationCommandOptionType, escapeMarkdown, GuildMember } from "discord.js";

import censor from "./language.js";
import CONSTANTS from "../../common/CONSTANTS.js";
import defineCommand from "../../commands.js";
import { joinWithAnd } from "../../util/text.js";

defineCommand(
	{
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

	async (interaction) => {
		const result = censor(interaction.options.getString("text", true));

		const words = result && result.words.flat();
		await interaction.reply({
			ephemeral: true,

			content: words
				? `⚠️ **${words.length} bad word${words.length > 0 ? "s" : ""} detected**!\n${
						CONSTANTS.roles.mod &&
						(interaction.member instanceof GuildMember
							? interaction.member.roles.resolve(CONSTANTS.roles.mod.id)
							: interaction.member.roles.includes(CONSTANTS.roles.mod.id))
							? `That text gives **${Math.trunc(result.strikes)} strike${
									result.strikes === 1 ? "" : "s"
							  }**.\n\n`
							: ""
				  }**I detected the following words as bad**: ${joinWithAnd(
						words,
						(word) => `*${escapeMarkdown(word)}*`,
				  )}`
				: `${CONSTANTS.emojis.statuses.yes} No bad words found.`,
		});
	},
);
