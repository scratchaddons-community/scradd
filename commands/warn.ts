import { ApplicationCommandOptionType } from "discord.js";
import CONSTANTS from "../common/CONSTANTS.js";
import warn, { MUTE_LENGTHS, STRIKES_PER_MUTE, DEFAULT_STRIKES } from "../common/warn.js";
import { stripMarkdown } from "../util/markdown.js";
import { defineCommand } from "../common/types/command.js";

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
				description: `How many strikes to add (defaults to ${DEFAULT_STRIKES})`,
				max: STRIKES_PER_MUTE * MUTE_LENGTHS.length + 1,
				min: 0,
			},
		},
	},
	async interaction(interaction) {
		const user = interaction.options.getUser("user", true);
		const reason = stripMarkdown(interaction.options.getString("reason") || "No reason given.");
		const strikes = interaction.options.getInteger("strikes") ?? DEFAULT_STRIKES;
		await warn(user, reason, strikes, interaction.user);

		await interaction.reply({
			allowedMentions: { users: [] },
			content: `${CONSTANTS.emojis.statuses.yes} ${
				strikes === 1
					? "Verbally warned"
					: `Warned ${Math.abs(strikes)} time${Math.abs(strikes) === 1 ? "" : "s"}`
			} ${user.toString()}.${reason ? " " + reason : ""}`,
		});
	},
});
export default command;
