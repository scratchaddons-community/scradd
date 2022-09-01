import { PermissionsBitField, SlashCommandBuilder } from "discord.js";
import CONSTANTS from "../common/CONSTANTS.js";
import warn, { MUTE_LENGTHS, WARNS_PER_MUTE } from "../common/moderation/warns.js";
import { stripMarkdown } from "../lib/markdown.js";

const DEFAULT_STRIKES = 1;

/** @type {import("../types/command").ChatInputCommand} */
export default {
	data: new SlashCommandBuilder()
		.setDescription("(Mod only) Warns a user")
		.setDefaultMemberPermissions(new PermissionsBitField().toJSON())
		.addUserOption((input) =>
			input.setDescription("The user to warn").setName("user").setRequired(true),
		)
		.addStringOption((input) =>
			input
				.setDescription("Reason for the warning")
				.setName("reason")
				.setRequired(process.env.NODE_ENV === "production"),
		)
		.addIntegerOption((input) =>
			input
				.setDescription(
					`How many strikes to add. Use a negative number here to remove strikes (defaults to ${DEFAULT_STRIKES})`,
				)
				.setName("strikes")
				.setMaxValue(WARNS_PER_MUTE * MUTE_LENGTHS.length + 1)
				.setMinValue(-1 * WARNS_PER_MUTE),
		),
	async interaction(interaction) {
		const user = interaction.options.getUser("user", true);
		const reason = stripMarkdown(interaction.options.getString("reason") || "No reason given.");
		const strikes = interaction.options.getInteger("strikes") ?? DEFAULT_STRIKES;

		const actualStrikes = await warn(user, reason, strikes, interaction.user);

		await interaction.reply(
			actualStrikes === false
				? {
						content: `${
							CONSTANTS.emojis.statuses.no
						} Cannot unwarn ${user.toString()} as they don’t have any active strikes.`,
						ephemeral: true,
				  }
				: {
						allowedMentions: { users: [] },
						content:
							CONSTANTS.emojis.statuses.yes +
							` ${
								["Unwarned", "Verbally warned", "Warned"][
									Math.sign(actualStrikes) + 1
								]
							} ${user.toString()}${
								Math.abs(actualStrikes) > 1
									? ` ${Math.abs(actualStrikes)} time${
											Math.abs(actualStrikes) === 1 ? "" : "s"
									  }`
									: ""
							}.${reason ? " " + reason : ""}`,
				  },
		);
	},
};
