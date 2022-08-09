import { SlashCommandBuilder } from "@discordjs/builders";
import { GuildMember } from "discord.js";
import CONSTANTS from "../common/CONSTANTS.js";
import warn, { MUTE_LENGTHS, WARNS_PER_MUTE } from "../common/moderation/warns.js";
import { stripMarkdown } from "../lib/markdown.js";

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDescription("Warns a user.")
		.setDefaultPermission(false)
		.addUserOption((input) =>
			input.setDescription("The user to warn.").setName("user").setRequired(true),
		)
		.addStringOption((input) =>
			input
				.setDescription("Why are you warning them?")
				.setName("reason")
				.setRequired(process.env.NODE_ENV === "production"),
		)
		.addIntegerOption((input) =>
			input
				.setDescription(
					"How many strikes to add. Use a negative number here to remove strikes. Defaults to 1",
				)
				.setName("strikes")
				.setMaxValue(WARNS_PER_MUTE * MUTE_LENGTHS.length + 1)
				.setMinValue(-1 * WARNS_PER_MUTE),
		),
	async interaction(interaction) {
		const user = interaction.options.getMember("user");
		const reason = stripMarkdown(interaction.options.getString("reason") || "No reason given.");
		const strikes = interaction.options.getInteger("strikes") ?? 1;

		if (!(user instanceof GuildMember))
			return interaction.reply({
				content: CONSTANTS.emojis.statuses.no + " Could not find that user.",
				ephemeral: true,
			});

		const actualStrikes = await warn(user, reason, strikes, interaction.user);

		return await interaction.reply({
			allowedMentions: { users: [] },
			content:
				CONSTANTS.emojis.statuses.yes +
				` ${actualStrikes < 0 ? "Unwarned" : "Warned"} ${user.toString()}${
					Math.abs(actualStrikes) !== 1
						? ` ${Math.abs(actualStrikes)} time${
								Math.abs(actualStrikes) === 1 ? "" : "s"
						  }`
						: ""
				}.${reason ? " " + reason : ""}`,
		});
	},
};

export default info;
