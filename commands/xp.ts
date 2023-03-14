import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import {
	ApplicationCommandOptionType,
	ButtonInteraction,
	ChatInputCommandInteraction,
	User,
} from "discord.js";
import path from "node:path";
import url from "node:url";

import client from "../client.js";
import CONSTANTS from "../common/CONSTANTS.js";
import { defineCommand } from "../common/types/command.js";
import {
	getLevelForXp,
	getXpForLevel,
	weeklyXpDatabase,
	xpDatabase as database,
} from "../common/xp.js";
import { paginate } from "../util/discord.js";
import { convertBase, nth } from "../util/numbers.js";
import { userSettingsDatabase } from "./settings.js";

GlobalFonts.registerFromPath(
	path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), `../../common/sora/font.ttf`),
	"Sora",
);

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

		switch (command) {
			case "rank": {
				const user = interaction.options.getUser("user") ?? interaction.user;
				await getUserRank(interaction, user);
				return;
			}
			case "top": {
				const allXp = database.data;
				const top = allXp.sort((one, two) => two.xp - one.xp);

				const user = interaction.options.getUser("user");
				const useMentions =
					userSettingsDatabase.data.find(
						(settings) => interaction.user.id === settings.user,
					)?.useMentions ?? false;
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
						`**Level ${getLevelForXp(xp.xp)}** - ${
							useMentions
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
					},
				);
			}
		}
	},

	buttons: {
		async xp(interaction, userId = "") {
			await getUserRank(interaction, await client.users.fetch(userId));
		},
	},
});
export default command;

async function getUserRank(
	interaction: ChatInputCommandInteraction<"cached" | "raw"> | ButtonInteraction,
	user: User,
) {
	const allXp = database.data;
	const top = allXp.sort((one, two) => two.xp - one.xp);

	const member = await CONSTANTS.guild.members.fetch(user.id).catch(() => {});

	const xp = Math.floor(allXp.find((entry) => entry.user === user.id)?.xp ?? 0);
	const level = getLevelForXp(xp);
	const xpForNextLevel = getXpForLevel(level + 1);
	const xpForPreviousLevel = getXpForLevel(level);
	const increment = xpForNextLevel - xpForPreviousLevel;
	const xpGained = xp - xpForPreviousLevel;
	const progress = xpGained / increment;
	const rank = top.findIndex((info) => info.user === user.id) + 1;
	const weeklyRank =
		weeklyXpDatabase.data
			.sort((one, two) => two.xp - one.xp)
			.findIndex((entry) => entry.user === user.id) + 1;
	const approximateWeeklyRank = Math.ceil(weeklyRank / 10) * 10;

	const canvas = createCanvas(1000, 50);
	const context = canvas.getContext("2d");
	context.fillStyle = "#0003";
	context.fillRect(0, 0, canvas.width, canvas.height);
	context.fillStyle = `#${convertBase(String(CONSTANTS.themeColor), 10, 16)}`;
	const rectangleSize = canvas.width * progress;
	const paddingPixels = 0.18 * canvas.height;
	context.fillRect(0, 0, rectangleSize, canvas.height);
	context.font = `${canvas.height * 0.9}px Sora`;
	if (progress < 0.145) {
		context.fillStyle = "#666";
		context.textAlign = "end";
		context.fillText(
			progress.toLocaleString([], { maximumFractionDigits: 1, style: "percent" }),
			canvas.width - paddingPixels,
			canvas.height - paddingPixels,
		);
	} else {
		context.fillStyle = "#0009";
		context.fillText(
			progress.toLocaleString([], { maximumFractionDigits: 1, style: "percent" }),
			paddingPixels,
			canvas.height - paddingPixels,
		);
	}

	await interaction.reply({
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
						name: "⏲ Weekly rank",

						value: weeklyRank
							? approximateWeeklyRank === 10
								? "Top 10"
								: `About ${nth(approximateWeeklyRank - 5, {
										bold: false,
										jokes: false,
								  })}`
							: "Inactive",

						inline: true,
					},
					{
						name: CONSTANTS.zeroWidthSpace,
						value: `**⬆ Next level progress** ${xpForNextLevel.toLocaleString()} XP needed`,
					},
				],

				footer: {
					text: `${
						rank
							? `Ranked ${rank.toLocaleString()}/${top.length.toLocaleString()}${
									CONSTANTS.footerSeperator
							  }`
							: ""
					}View the leaderboard with /xp top`,
				},

				image: { url: "attachment://progress.png" },
			},
		],

		files: [{ attachment: canvas.toBuffer("image/png"), name: "progress.png" }],
	});
}
