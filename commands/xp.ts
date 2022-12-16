import { ApplicationCommandOptionType } from "discord.js";

import CONSTANTS from "../common/CONSTANTS.js";
import { getLevelForXp, getXpForLevel, xpDatabase as database } from "../common/xp.js";
import { paginate } from "../util/discord.js";
import { makeProgressBar } from "../util/numbers.js";
import { defineCommand } from "../common/types/command.js";
import { userSettingsDatabase } from "./settings.js";
import client from "../client.js";

const command = defineCommand({
	data: {
		description: "Commands to view users’ XP amounts",
		subcommands: {
			rank: {
				description: "View a users’ XP rank",
				options: {
					user: {
						type: ApplicationCommandOptionType.User,
						description: "User to view (defaults to you)",
					},
				},
			},
			top: {
				description: "View all users sorted by how much XP they have",
				options: {
					user: {
						type: ApplicationCommandOptionType.User,
						description: "User to jump to",
					},
				},
			},
		},
	},

	async interaction(interaction) {
		const command = interaction.options.getSubcommand(true);

		const allXp = database.data;
		const top = allXp.sort((one, two) => two.xp - one.xp);

		switch (command) {
			case "rank": {
				const user = interaction.options.getUser("user") || interaction.user;

				const member = await CONSTANTS.guild.members.fetch(user.id).catch(() => {});

				const xp = allXp.find((entry) => entry.user === user.id)?.xp || 0;
				const level = getLevelForXp(xp);
				const xpForNextLevel = getXpForLevel(level + 1);
				const xpForPreviousLevel = getXpForLevel(level);
				const increment = xpForNextLevel - xpForPreviousLevel;
				const xpGained = xp - xpForPreviousLevel;
				const progress = xpGained / increment;
				const rank = top.findIndex((info) => info.user === user.id) + 1;
				interaction.reply({
					embeds: [
						{
							color: member?.displayColor,
							author: {
								icon_url: (member || user).displayAvatarURL(),
								name: member?.displayName ?? user.username,
							},
							title: "XP Rank",
							fields: [
								{ name: "📊 Level", value: level.toLocaleString(), inline: true },
								{ name: "✨ XP", value: xp.toLocaleString(), inline: true },
								{
									name: CONSTANTS.zeroWidthSpace,
									value: CONSTANTS.zeroWidthSpace,
									inline: true,
								},
								{
									name: "⬆ Next Level XP",
									value: xpForNextLevel.toLocaleString(),
									inline: true,
								},
								{
									name: `${CONSTANTS.emojis.misc.percent} Progress`,
									value:
										progress.toLocaleString([], {
											maximumFractionDigits: 2,
											style: "percent",
										}) + ` (${xpGained}/${increment})`,
									inline: true,
								},
								{
									name: CONSTANTS.zeroWidthSpace,
									value: CONSTANTS.zeroWidthSpace,
									inline: true,
								},
								{
									value: CONSTANTS.zeroWidthSpace,
									name: makeProgressBar(progress),
								},
							],

							footer: {
								text:
									(rank
										? `Ranked ${
												rank.toLocaleString() +
												"/" +
												top.length.toLocaleString()
										  }${CONSTANTS.footerSeperator}`
										: "") + `View the leaderboard with /xp top`,
							},
						},
					],
				});
				return;
			}
			case "top": {
				const user = interaction.options.getUser("user");
				const useMentions =
					userSettingsDatabase.data.find(
						(settings) => interaction.user.id === settings.user,
					)?.useMentions ?? false;
				const index = user ? top.findIndex(({ user: id }) => id === user.id) : 0;
				if (index === -1)
					return await interaction.reply({
						content: `${
							CONSTANTS.emojis.statuses.no
						} ${user?.toString()} could not be found! Do they have any XP?`,
						ephemeral: true,
					});

				await paginate(
					top,
					async (xp) => {
						return `**Level ${getLevelForXp(xp.xp)}** - ${
							useMentions
								? `<@${xp.user}>`
								: (
										await client.users
											.fetch(xp.user)
											.catch(() => ({ username: `<@${xp.user}>` }))
								  ).username
						} (${xp.xp.toLocaleString()} XP)`;
					},
					(data) => interaction[interaction.replied ? "editReply" : "reply"](data),
					{
						singular: "user",
						title: `Leaderboard for ${CONSTANTS.guild.name}`,
						user: interaction.user,
						rawOffset: index,
					},
				);
			}
		}
	},
});
export default command;
