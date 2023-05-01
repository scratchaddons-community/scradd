import { ApplicationCommandOptionType, ButtonStyle, ComponentType, MessageType } from "discord.js";

import client from "../../client.js";
import CONSTANTS from "../../common/CONSTANTS.js";
import defineCommand from "../../commands.js";
import { getLevelForXp, xpDatabase } from "./misc.js";
import { paginate } from "../../util/discord.js";
import { getSettings } from "../settings.js";
import { defineButton } from "../../components.js";
import getUserRank from "./rank.js";
import defineEvent from "../../events.js";
import { giveXpForMessage } from "./giveXp.js";

defineEvent("messageCreate", async (message) => {
	if (message.flags.has("Ephemeral") || message.type === MessageType.ThreadStarterMessage) return;

	if (message.channel.isDMBased() || message.guild?.id !== CONSTANTS.guild.id) return;

	if (process.env.NODE_ENV !== "production" || !message.author.bot || message.interaction) {
		giveXpForMessage(message);
	}
});

defineCommand(
	{
		name: "xp",
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

	async (interaction) => {
		const command = interaction.options.getSubcommand(true);

		switch (command) {
			case "rank": {
				const user = interaction.options.getUser("user") ?? interaction.user;
				await getUserRank(interaction, user);
				return;
			}
			case "top": {
				const allXp = [...xpDatabase.data];
				const top = allXp.sort((one, two) => two.xp - one.xp);

				const user = interaction.options.getUser("user");
				const index = user ? top.findIndex(({ user: id }) => id === user.id) : undefined;
				if (index === -1) {
					return await interaction.reply({
						content: `${
							CONSTANTS.emojis.statuses.no
						} ${user?.toString()} could not be found! Do they have any XP?`,

						ephemeral: true,
					});
				}

				await paginate(
					top,
					async (xp) =>
						`**Level ${getLevelForXp(Math.abs(xp.xp)) * Math.sign(xp.xp)}** - ${
							getSettings(interaction.user).useMentions
								? `<@${xp.user}>`
								: (
										await client.users
											.fetch(xp.user)
											.catch(() => ({ username: `<@${xp.user}>` }))
								  ).username
						} (${Math.floor(xp.xp).toLocaleString()} XP)`,
					async (data) =>
						await interaction[interaction.replied ? "editReply" : "reply"](data),
					{
						singular: "user",
						title: `Leaderboard for ${CONSTANTS.guild.name}`,
						user: interaction.user,
						rawOffset: index,
						generateComponents() {
							return getSettings(interaction.user, false)?.useMentions === undefined
								? [
										{
											customId: "levelUpPings_toggleSetting",
											type: ComponentType.Button,
											label: "Toggle Mentions",
											style: ButtonStyle.Success,
										},
								  ]
								: undefined;
						},
					},
				);
			}
		}
	},
);
defineButton("xp", async (interaction, userId = "") => {
	await getUserRank(interaction, await client.users.fetch(userId));
});
