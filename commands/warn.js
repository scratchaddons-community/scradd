import { SlashCommandBuilder } from "@discordjs/builders";
import { GuildMember } from "discord.js";
import CONSTANTS from "../common/CONSTANTS.js";
import { warn } from "../common/moderation/warns.js";

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
				.setName("strikes"),
		),
	async interaction(interaction) {
		const user = interaction.options.getMember("user");
		const reason = interaction.options.getString("reason") || "";
		const strikes = interaction.options.getInteger("strikes") ?? 1;

		if (!(user instanceof GuildMember))
			return interaction.reply({
				content: CONSTANTS.emojis.statuses.no + " Could not find that user.",
				ephemeral: true,
			});

		const actualStrikes = await warn(user, reason, strikes);
		if (actualStrikes === 0)
			return interaction.reply({
				content: CONSTANTS.emojis.statuses.no + " Could not issue 0 strikes.",
				ephemeral: true,
			});
		return await interaction.reply({
			allowedMentions: { users: [] },
			content:
				CONSTANTS.emojis.statuses.yes +
				` ${actualStrikes > 0 ? "Warned" : "Unwarned"} ${user.toString()}${
					Math.abs(actualStrikes) !== 1 ? ` ${Math.abs(actualStrikes)} times` : ""
				}.${reason ? " " + reason : ""}`,
			ephemeral: true,
		});
	},
};

export default info;
