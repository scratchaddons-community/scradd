import { ApplicationCommandOptionType, User } from "discord.js";
import client from "../client.js";

import CONSTANTS from "../common/CONSTANTS.js";
import log from "../common/logging.js";
import warn, {
	MUTE_LENGTHS,
	STRIKES_PER_MUTE,
	DEFAULT_STRIKES,
	filterToStrike,
	strikeDatabase,
} from "../common/punishments.js";
import { defineCommand } from "../common/types/command.js";
import giveXp, { DEFAULT_XP } from "../common/xp.js";

const command = defineCommand({
	data: {
		description: "(Mods only) Warns a user",
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
				maxValue: STRIKES_PER_MUTE * MUTE_LENGTHS.length + 1,
				minValue: 0,
			},
		},
	},

	async interaction(interaction) {
		const user = interaction.options.getUser("user", true);
		const reason = interaction.options.getString("reason") || "No reason given.";
		const strikes = interaction.options.getInteger("strikes") ?? DEFAULT_STRIKES;
		await warn(user, reason, strikes, interaction.user);

		await interaction.reply({
			allowedMentions: { users: [] },

			content: `${CONSTANTS.emojis.statuses.yes} ${
				strikes ? "W" : "Verbally w"
			}arned ${user.toString()}${strikes > 1 ? ` ${strikes} times` : ""}. ${reason}`,
		});
	},
	buttons: {
		async removeStrike(interaction, id) {
			const strike = id && (await filterToStrike(id));
			if (!strike) {
				return await interaction.reply({
					ephemeral: true,
					content: `${CONSTANTS.emojis.statuses.no} Invalid strike ID!`,
				});
			}

			if (strike.removed) {
				return await interaction.reply({
					ephemeral: true,
					content: `${CONSTANTS.emojis.statuses.no} That strike was already removed!`,
				});
			}

			strikeDatabase.data = strikeDatabase.data.map((toRemove) =>
				id === toRemove.id ? { ...toRemove, removed: true } : toRemove,
			);
			const user =
				(await client.users.fetch(strike.user).catch(() => {})) || `<@${strike.user}>`;
			const { url: logUrl } = await interaction.reply({
				fetchReply: true,
				content: `${
					CONSTANTS.emojis.statuses.yes
				} Removed ${user.toString()}’s strike \`${id}\`!`,
			});
			const member = await CONSTANTS.guild.members.fetch(strike.user).catch(() => {});
			if (
				member?.communicationDisabledUntil &&
				Number(member.communicationDisabledUntil) > Date.now()
			)
				await member.disableCommunicationUntil(Date.now());
			await log(
				`${CONSTANTS.emojis.statuses.yes} ${
					interaction.member
				} removed ${user.toString()}’s strike \`${id}\`!`,
				"members",
			);
			if (user instanceof User) await giveXp(user, logUrl, strike.count * DEFAULT_XP);
		},
		async addStrikeBack(interaction, id) {
			const strike = id && (await filterToStrike(id));
			if (!strike) {
				return await interaction.reply({
					ephemeral: true,
					content: `${CONSTANTS.emojis.statuses.no} Invalid strike ID!`,
				});
			}

			if (!strike.removed) {
				return await interaction.reply({
					ephemeral: true,
					content: `${CONSTANTS.emojis.statuses.no} That strike was not removed!`,
				});
			}

			strikeDatabase.data = strikeDatabase.data.map((toRemove) =>
				id === toRemove.id ? { ...toRemove, removed: false } : toRemove,
			);
			const user =
				(await client.users.fetch(strike.user).catch(() => {})) || `<@${strike.user}>`;
			const { url: logUrl } = await interaction.reply({
				fetchReply: true,
				content: `${
					CONSTANTS.emojis.statuses.yes
				} Added ${user.toString()}’s strike \`${id}\` back!`,
			});
			const member = await CONSTANTS.guild.members.fetch(strike.user).catch(() => {});
			if (
				member?.communicationDisabledUntil &&
				Number(member.communicationDisabledUntil) > Date.now()
			)
				await member.disableCommunicationUntil(Date.now());
			await log(
				`${CONSTANTS.emojis.statuses.yes} ${
					interaction.member
				} added ${user.toString()}’s strike \`${id}\` back!`,
				"members",
			);
			if (user instanceof User) await giveXp(user, logUrl, strike.count * DEFAULT_XP);
		},
	},
});
export default command;
