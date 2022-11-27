import { ApplicationCommandOptionType } from "discord.js";
import CONSTANTS from "../common/CONSTANTS.js";
import warn, { MUTE_LENGTHS, WARNS_PER_MUTE } from "../common/warns.js";
import { stripMarkdown } from "../util/markdown.js";
import { defineCommand } from "../common/types/command.js";

const DEFAULT_STRIKES = 1;

const command = defineCommand({
	data: {
		description: "(Mod only) Warns a user",
		restricted: true,
		options: {
			user: {
				type: ApplicationCommandOptionType.User,
				description: "The user to warn",
				required: true,
			},
			reason: {
				type: ApplicationCommandOptionType.String,
				description: "Reason for the warning",
				required: process.env.NODE_ENV === "production",
			},
			strikes: {
				type: ApplicationCommandOptionType.Integer,
				description: `How many strikes to add. Use a negative number here to remove strikes (defaults to ${DEFAULT_STRIKES})`,
				max: WARNS_PER_MUTE * MUTE_LENGTHS.length + 1,
				min: -1 * WARNS_PER_MUTE,
			},
		},
	},
	async interaction(interaction) {
		const user = interaction.options.getUser("user", true);
		const reason = stripMarkdown(interaction.options.getString("reason") || "No reason given.");
		const strikes = interaction.options.getInteger("strikes") ?? DEFAULT_STRIKES;

		const actualStrikes = await warn(user, reason, strikes, interaction.user);

		await interaction.reply({
			allowedMentions: { users: [] },
			content:
				actualStrikes === false
					? `${
							CONSTANTS.emojis.statuses.no
					  } Cannot unwarn ${user.toString()} as they don’t have any active strikes.`
					: CONSTANTS.emojis.statuses.yes +
					  ` ${
							["Unwarned", "Verbally warned", "Warned"][Math.sign(actualStrikes) + 1]
					  } ${user.toString()}${
							Math.abs(actualStrikes) > 1
								? ` ${Math.abs(actualStrikes)} time${
										Math.abs(actualStrikes) === 1 ? "" : "s"
								  }`
								: ""
					  }.${reason ? " " + reason : ""}`,

			ephemeral: actualStrikes === false,
		});
	},
});
export default command;
