import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ComponentType,
	GuildMember,
	time,
} from "discord.js";
import {
	client,
	defineButton,
	defineEvent,
	defineMenuCommand,
	defineSelect,
	defineSubcommands,
} from "strife.js";
import config from "../../common/config.js";
import { giveXpForMessage } from "./give-xp.js";
import getUserRank, { top } from "./rank.js";
import { recentXpDatabase } from "./util.js";

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
					"user": {
						type: ApplicationCommandOptionType.User,
						description: "User to jump to",
					},
					"only-members": {
						type: ApplicationCommandOptionType.Boolean,
						description:
							"Only include server members and exclude those who have left (defaults to false)",
					},
				},
			},
			...(process.env.CANVAS !== "false" && {
				graph: { description: "Graph users’ XP over the last week", options: {} } as const,
			}),
		},
	},

	async (interaction, options) => {
		const user =
			options?.options &&
			"user" in options.options &&
			(options.options.user instanceof GuildMember ?
				options.options.user.user
			:	options.options.user);

		switch (options?.subcommand ?? "rank") {
			case "rank": {
				await getUserRank(interaction, user || interaction.user);
				return;
			}
			case "graph": {
				const startData =
					recentXpDatabase.data.toSorted((one, two) => one.time - two.time)[0]?.time ?? 0;
				return await interaction.reply({
					content: `Select up to 7 users. I will graph thier XP __last__ week (${time(
						new Date(startData),
						"d",
					)} to ${time(new Date(startData + 604_800_000), "d")}).`,
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
				await top(
					interaction,
					user || undefined,
					options?.options && "only-members" in options.options ?
						options.options["only-members"]
					:	undefined,
				);
				break;
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
