import { ApplicationCommandOptionType, ButtonStyle, ComponentType, MessageType } from "discord.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import { getLevelForXp, xpDatabase } from "./misc.js";
import { paginate } from "../../util/discord.js";
import { getSettings } from "../settings.js";
import { client, defineCommand, defineEvent, defineButton, defineSelect } from "strife.js";
import getUserRank from "./rank.js";
import { giveXpForMessage } from "./giveXp.js";

defineEvent("messageCreate", async (message) => {
	if (message.flags.has("Ephemeral") || message.type === MessageType.ThreadStarterMessage) return;

	if (message.channel.isDMBased() || message.guild?.id !== config.guild.id) return;

	giveXpForMessage(message);
});

defineCommand(
	{
		name: "xp",
		description: "Commands to view users’ XP amounts",

		subcommands: {
		  ...{
			rank: {
				description: "View a user’s XP rank",

				options: {
					user: {
						type: ApplicationCommandOptionType.User,
						description: "User to view (defaults to you)",
					},
				},
			},

			top: {
				description: "View the server XP leaderboard",

				options: {
					user: {
						type: ApplicationCommandOptionType.User,
						description: "User to jump to",
					},
				},
			},
		},
		...(constants.canvasEnabled ? {
			graph: { description: "Graph users’ XP over the last week" },
		} : {}),
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
			case "graph": {
				return await interaction.reply({
					components: [
						{
							type: ComponentType.ActionRow,
							components: [
								{
									type: ComponentType.UserSelect,
									placeholder: "Select users",
									customId: "_weeklyXpGraph",
									maxValues: 7,
								},
							],
						},
					],
				});
			}
			case "top": {
				const allXp = [...xpDatabase.data];
				const top = allXp.sort((one, two) => two.xp - one.xp);

				const user = interaction.options.getUser("user");
				const index = user ? top.findIndex(({ user: id }) => id === user.id) : undefined;
				if (index === -1) {
					return await interaction.reply({
						content: `${
							constants.emojis.statuses.no
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
											.catch(() => ({ displayName: `<@${xp.user}>` }))
								  ).displayName
						} (${Math.floor(xp.xp).toLocaleString("en-us")} XP)`,
					async (data) =>
						await interaction[interaction.replied ? "editReply" : "reply"](data),
					{
						singular: "user",
						title: `Leaderboard for ${config.guild.name}`,
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

if (constants.canvasEnabled) {
  defineSelect("weeklyXpGraph", (await import("./graph.js")).default);
}
