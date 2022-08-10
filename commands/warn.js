import { SlashCommandBuilder, GuildMember } from "discord.js";
import CONSTANTS from "../common/CONSTANTS.js";
import warn, { MUTE_LENGTHS, WARNS_PER_MUTE } from "../common/moderation/warns.js";
import { stripMarkdown } from "../lib/markdown.js";

const DEFAULT_STRIKES = 1;

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDescription("Warns a user")
		.setDefaultPermission(false)
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
					`How many strikes to add. Use a negative number here to remove strikes. Defaults to ${DEFAULT_STRIKES}`,
				)
				.setName("strikes")
				.setMaxValue(WARNS_PER_MUTE * MUTE_LENGTHS.length + 1)
				.setMinValue(-1 * WARNS_PER_MUTE),
		),
	async interaction(interaction) {
		const user = interaction.options.getMember("user");
		const reason = stripMarkdown(interaction.options.getString("reason") || "No reason given.");
		const strikes = interaction.options.getInteger("strikes") ?? DEFAULT_STRIKES;

		if (!(user instanceof GuildMember))
			return interaction.reply({
				content: CONSTANTS.emojis.statuses.no + " Could not find that user.",
				ephemeral: true,
			});

		const actualStrikes = await warn(user, reason, strikes, interaction.user);

		if (actualStrikes === false)
			return await interaction.reply({
				content: `${
					CONSTANTS.emojis.statuses.no
				} Cannot unwarn ${user.toString()} as they do not have any active strikes.`,
				ephemeral: true,
			});

		return await interaction.reply({
			allowedMentions: { users: [] },
			content:
				CONSTANTS.emojis.statuses.yes +
				` ${
					["Unwarned", "Verbally warned", "Warned"][Math.sign(actualStrikes) + 1]
				} ${user.toString()}${
					Math.abs(actualStrikes) > 1
						? ` ${Math.abs(actualStrikes)} time${
								Math.abs(actualStrikes) === 1 ? "" : "s"
						  }`
						: ""
				}.${reason ? " " + reason : ""}`,
		});
	},
};

export default info;
