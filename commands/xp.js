import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { guild } from "../client.js";
import CONSTANTS from "../common/CONSTANTS.js";
import { extractData, getDatabases } from "../common/databases.js";
import { getLevelForXp, getXpForLevel } from "../common/xp.js";
import { paginate } from "../lib/message.js";
import { makeProgressBar } from "../lib/numbers.js";

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDescription("Commands to view users’ XP amounts")
		.addSubcommand((subcommand) =>
			subcommand
				.setName("rank")
				.setDescription("View a users’ XP rank")
				.addUserOption((input) =>
					input
						.setName("user")
						.setDescription("User to view (defaults to you)")
						.setRequired(false),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("top")
				.setDescription("View the users with the most XP in the server"),
		),

	async interaction(interaction) {
		const command = interaction.options.getSubcommand(true);

		const database = (await getDatabases(["xp"])).xp;
		const allXp = /** @type {{ user: string; xp: number }[]} */ (await extractData(database));
		const top = allXp.sort((one, two) => two.xp - one.xp);

		switch (command) {
			case "rank": {
				const user = interaction.options.getUser("user") || interaction.user;

				const member = await guild.members.fetch(user.id).catch(() => {});

				const xp = allXp.find((entry) => entry.user === user.id)?.xp || 0;
				const level = getLevelForXp(xp);
				const nextLevel = level + 1;
				const xpForNextLevel = getXpForLevel(nextLevel);
				const xpForPreviousLevel = getXpForLevel(level);
				const increment = xpForNextLevel - xpForPreviousLevel;
				const progress = (xp - xpForPreviousLevel) / increment;
				const rank = top.findIndex((info) => info.user === user.id) + 1;
				interaction.reply({
					embeds: [
						new EmbedBuilder()
							.setColor(member ? member.displayColor : null)
							.setAuthor({
								iconURL: (member || user).displayAvatarURL(),
								name: member?.displayName ?? user.username,
							})
							.setTitle("XP Rank")
							.addFields(
								{ name: "📊 Level", value: level.toLocaleString(), inline: true },
								{ name: "🔢 XP", value: xp.toLocaleString(), inline: true },
								{
									name: CONSTANTS.zeroWidthSpace,
									value: CONSTANTS.zeroWidthSpace,
									inline: true,
								},
								{
									name: "⬆ Next level",
									value: nextLevel.toLocaleString(),
									inline: true,
								},
								{
									name: "💯 Total XP Required",
									value: xpForNextLevel.toLocaleString(),
									inline: true,
								},
								{
									name: CONSTANTS.zeroWidthSpace,
									value: CONSTANTS.zeroWidthSpace,
									inline: true,
								},
								{
									name: "✨ Remaining XP",
									value: (xpForNextLevel - xp).toLocaleString(),
									inline: true,
								},
								{
									name: "<:percent:1009144273331040296> Progress",
									value: progress.toLocaleString([], {
										maximumFractionDigits: 2,
										style: "percent",
									}),
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
							)
							.setFooter({
								text:
									(rank
										? `Ranked ${
												rank.toLocaleString() +
												"/" +
												top.length.toLocaleString()
										  }${CONSTANTS.footerSeperator}`
										: "") + `View the leaderboard with /xp top`,
							}),
					],
				});
				return;
			}
			case "top": {
				await paginate(
					top,
					(xp) => {
						return `**Level ${getLevelForXp(xp.xp)}** - <@${
							xp.user
						}> (${xp.xp.toLocaleString()} XP)`;
					},
					"No users found.",
					`Leaderboard for ${guild.name}`,
					(data) =>
						interaction[
							interaction.replied || interaction.deferred ? "editReply" : "reply"
						](data),
				);
			}
		}
	},
};

export default info;
