import { SlashCommandBuilder, Embed } from "@discordjs/builders";
import { GuildMember } from "discord.js";
import CONSTANTS from "../common/CONSTANTS.js";
import { extractData, getDatabases } from "../common/databases.js";
import { getLevelForXp, getXpForLevel } from "../common/xp.js";
import { makeProgressBar } from "../lib/numbers.js";

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDescription("Commands to view users' XP amounts.")
		.addSubcommand((subcommand) =>
			subcommand
				.setName("rank")
				.setDescription("View a users' XP rank.")
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
				.setDescription("View the users with the most XP in the server")
				.addNumberOption((input) =>
					input
						.setName("page")
						.setDescription("The page to view (defaults to 1).")
						.setRequired(false),
				),
		),

	async interaction(interaction) {
		const command = interaction.options.getSubcommand();

		switch (command) {
			case "rank": {
				const user = interaction.options.getUser("user") || interaction.user;

				const modTalk = interaction.guild?.publicUpdatesChannel;
				if (!modTalk) throw new ReferenceError("Could not find mod talk");

				const database = (await getDatabases(["xp"], modTalk)).xp;

				const member = await interaction.guild?.members.fetch(user.id).catch(() => {});

				const allXp = /** @type {{ user: string; xp: number }[]} */ (
					await extractData(database)
				);
				const xp = allXp.find((entry) => entry.user === user.id)?.xp || 0;
				const level = getLevelForXp(xp);
				const nextLevel = level + 1;
				const xpForNextLevel = getXpForLevel(nextLevel);
				const xpForPreviousLevel = getXpForLevel(level);
				const increment = xpForNextLevel - xpForPreviousLevel;
				const progress = (xp - xpForPreviousLevel) / increment;
				return interaction.reply({
					embeds: [
						new Embed()
							.setColor(member instanceof GuildMember ? member.displayColor : null)
							.setAuthor({
								iconURL: (member || user).displayAvatarURL(),
								name: member?.displayName ?? user.username,
							})
							.setTitle("XP Rank")
							.addFields(
								{ name: "Level", value: level.toLocaleString(), inline: true },
								{ name: "XP", value: xp.toLocaleString(), inline: true },
								{ name: "\u200b", value: "\u200b", inline: true },
								{
									name: "Next level",
									value: nextLevel.toLocaleString(),
									inline: true,
								},
								{
									name: "Total XP Required",
									value: xpForNextLevel.toLocaleString(),
									inline: true,
								},
								{ name: "\u200b", value: "\u200b", inline: true },
								{
									name: "Remaining XP",
									value: (xpForNextLevel - xp).toLocaleString(),
									inline: true,
								},
								{
									name: "Progress",
									value: progress.toLocaleString([], {
										maximumFractionDigits: 2,
										style: "percent",
									}),
									inline: true,
								},
								{ name: "\u200b", value: "\u200b", inline: true },
								{
									value		: "\u200b",
									name			: makeProgressBar(progress) ,
								},
							)
							.setFooter({
								text: `Ranked ${
									(1).toLocaleString() + "/" + (122).toLocaleString() // todo
								}${CONSTANTS.footerSeperator}View the leaderboard with /xp top`,
							}),
					],
				});
			}
			case "top": {
			}
		}
	},
};

export default info;

/*
 */
