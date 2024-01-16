import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ComponentType,
	GuildMember,
} from "discord.js";
import config from "../../common/config.js";
import {
	client,
	defineSubcommands,
	defineEvent,
	defineButton,
	defineSelect,
	defineMenuCommand,
} from "strife.js";
import getUserRank, { top } from "./rank.js";
import { giveXpForMessage } from "./giveXp.js";

defineEvent("messageCreate", async (message) => {
	if (message.guild?.id !== config.guild.id) return;

	await giveXpForMessage(message);
});

defineSubcommands(
	{
		name: "xp",
		description: "View users’ XP amounts",

		subcommands: {
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
			...(process.env.CANVAS !== "false" && {
				graph: { description: "Graph users’ XP over the last week", options: {} } as const,
			}),
		},
	},

	async (interaction, options) => {
		switch (options?.subcommand) {
			case "rank": {
				const user =
					options.options.user instanceof GuildMember
						? options.options.user.user
						: options.options.user ?? interaction.user;
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
				await top(interaction, options.options.user);
			}
		}
	},
);
defineButton("xp", async (interaction, userId = "") => {
	await getUserRank(interaction, await client.users.fetch(userId));
});

defineButton("viewLeaderboard", async (interaction, userId) => {
	await top(interaction, await client.users.fetch(userId));
});

if (process.env.CANVAS !== "false") {
	const { default: weeklyXpGraph } = await import("./graph.js");
	defineSelect("weeklyXpGraph", weeklyXpGraph);
}

defineMenuCommand({ name: "XP Rank", type: ApplicationCommandType.User }, async (interaction) => {
	await getUserRank(interaction, interaction.targetUser);
});
