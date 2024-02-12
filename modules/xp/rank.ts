import {
	ComponentType,
	type User,
	ButtonStyle,
	type RepliableInteraction,
	type ButtonInteraction,
	type ChatInputCommandInteraction,
	type GuildMember,
} from "discord.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import { nth } from "../../util/numbers.js";
import { getFullWeeklyData, xpDatabase } from "./util.js";
import { getLevelForXp, getXpForLevel } from "./misc.js";
import { paginate } from "../../util/discord.js";
import { getSettings, mentionUser } from "../settings.js";

export default async function getUserRank(interaction: RepliableInteraction, user: User) {
	const allXp = xpDatabase.data.toSorted((one, two) => two.xp - one.xp);

	const member = await config.guild.members.fetch(user.id).catch(() => void 0);

	const xp = Math.floor(allXp.find((entry) => entry.user === user.id)?.xp ?? 0);
	const level = getLevelForXp(xp);
	const xpForNextLevel = getXpForLevel(level + 1);
	const xpForPreviousLevel = getXpForLevel(level);
	const increment = xpForNextLevel - xpForPreviousLevel;
	const xpGained = xp - xpForPreviousLevel;
	const progress = xpGained / increment;
	const rank = allXp.findIndex((info) => info.user === user.id) + 1;
	const weeklyRank = getFullWeeklyData().findIndex((entry) => entry.user === user.id) + 1;
	const approximateWeeklyRank = Math.ceil(weeklyRank / 10) * 10;

	const guildMembers = await config.guild.members.fetch();
	const serverRank =
		allXp
			.filter((entry) => guildMembers.has(entry.user))
			.findIndex((entry) => entry.user === user.id) + 1;
	const rankInfo =
		rank &&
		`Ranked ${rank.toLocaleString()}/${allXp.length.toLocaleString()}${
			serverRank
				? ` (${serverRank.toLocaleString()}/${guildMembers.size.toLocaleString()} in the server)`
				: ""
		}`;

	await interaction.reply({
		embeds: [
			{
				author: {
					icon_url: (member ?? user).displayAvatarURL(),
					name: (member ?? user).displayName,
				},

				fields: [
					{ name: "📊 Level", value: level.toLocaleString(), inline: true },
					{ name: "✨ XP", value: xp.toLocaleString(), inline: true },
					{
						name: "⏳ Weekly rank",

						value: weeklyRank
							? approximateWeeklyRank === 10
								? "Top 10"
								: `About ${nth(Math.max(0, approximateWeeklyRank - 5))}`
							: "Inactive this week",

						inline: true,
					},
					{
						name: constants.zws,
						value: `**⬆️ Next level progress** ${xpForNextLevel.toLocaleString()} XP needed`,
					},
				],

				color: member?.displayColor,
				title: "XP Rank",
				footer: rankInfo ? { text: rankInfo } : undefined,
				image: { url: "attachment://progress.png" },
			},
		],

		components: [
			{
				components: [
					{
						type: ComponentType.Button,
						customId: `${user.id}_viewLeaderboard`,
						label: "Leaderboard",
						style: ButtonStyle.Primary,
					},
				],
				type: ComponentType.ActionRow,
			},
		],

		files: await makeCanvasFiles(progress),
		ephemeral:
			interaction.isButton() &&
			interaction.message.interaction?.user.id !== interaction.user.id,
	});
}

async function makeCanvasFiles(progress: number) {
	if (process.env.CANVAS === "false") return [];

	const { createCanvas } = await import("@napi-rs/canvas");
	const canvas = createCanvas(1000, 50);
	const context = canvas.getContext("2d");
	context.fillStyle = "#0003";
	context.fillRect(0, 0, canvas.width, canvas.height);
	context.fillStyle = `#${constants.themeColor.toString(16)}`;
	const rectangleSize = canvas.width * progress;
	const paddingPixels = 0.18 * canvas.height;
	context.fillRect(0, 0, rectangleSize, canvas.height);
	context.font = `${canvas.height * 0.9}px ${constants.fonts}`;
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
	return [{ attachment: canvas.toBuffer("image/png"), name: "progress.png" }];
}

export async function top(
	interaction: ButtonInteraction | ChatInputCommandInteraction<"cached" | "raw">,
	user?: GuildMember | User,
) {
	const leaderboard = xpDatabase.data.toSorted((one, two) => two.xp - one.xp);

	const index = user && leaderboard.findIndex(({ user: id }) => id === user.id);
	if (user && index === -1) {
		return await interaction.reply({
			content: `${
				constants.emojis.statuses.no
			} ${user.toString()} could not be found! Do they have any XP?`,

			ephemeral: true,
		});
	}

	await paginate(
		leaderboard,
		async (xp) =>
			`**Level ${getLevelForXp(xp.xp)}** - ${await mentionUser(
				xp.user,
				interaction.user,
				interaction.guild ?? config.guild,
			)} (${Math.floor(xp.xp).toLocaleString()} XP)`,
		(data) => interaction.reply(data),
		{
			title: "XP Leaderboard",
			singular: "user",

			user: interaction.user,
			rawOffset: index,
			ephemeral:
				interaction.isButton() &&
				interaction.message.interaction?.user.id !== interaction.user.id,

			async generateComponents() {
				return (await getSettings(interaction.user, false)).useMentions === undefined
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
			customComponentLocation: "below",
		},
	);
}
