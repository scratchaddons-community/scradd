import { ComponentType, type User, ButtonStyle, type RepliableInteraction } from "discord.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import { nth } from "../../util/numbers.js";
import { getLevelForXp, getXpForLevel, getFullWeeklyData, xpDatabase } from "./misc.js";

export default async function getUserRank(interaction: RepliableInteraction, user: User) {
	const allXp = xpDatabase.data;
	const top = allXp.toSorted((one, two) => Math.abs(two.xp) - Math.abs(one.xp));

	const member = await config.guild.members.fetch(user.id).catch(() => void 0);

	const xp = Math.floor(allXp.find((entry) => entry.user === user.id)?.xp ?? 0);
	const level = getLevelForXp(Math.abs(xp));
	const xpForNextLevel = getXpForLevel(level + 1) * (Math.sign(xp) || 1);
	const xpForPreviousLevel = getXpForLevel(level) * (Math.sign(xp) || 1);
	const increment = xpForNextLevel - xpForPreviousLevel;
	const xpGained = xp - xpForPreviousLevel;
	const progress = xpGained / increment;
	const rank = top.findIndex((info) => info.user === user.id) + 1;
	const weeklyRank = getFullWeeklyData().findIndex((entry) => entry.user === user.id) + 1;
	const approximateWeeklyRank = Math.ceil(weeklyRank / 10) * 10;

	const members = await config.guild.members.fetch();
	const serverRank =
		allXp
			.filter(({ user }) => members.has(user))
			.toSorted((one, two) => two.xp - one.xp)
			.findIndex((info) => info.user === user.id) + 1;
	const rankInfo =
		rank &&
		`Ranked ${rank.toLocaleString("en-us")}/${top.length.toLocaleString("en-us")}${
			serverRank
				? ` (${serverRank.toLocaleString("en-us")}/${members.size.toLocaleString(
						"en-us",
				  )} in the server)`
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
					{
						name: "📊 Level",
						value: (level * Math.sign(xp)).toLocaleString("en-us"),
						inline: true,
					},
					{ name: "✨ XP", value: xp.toLocaleString("en-us"), inline: true },
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
						value: `**${
							Math.sign(xp) === -1 ? "⬇ Previous" : "⬆️ Next"
						} level progress** ${xpForNextLevel.toLocaleString("en-us")} XP needed`,
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
			progress.toLocaleString("en-us", { maximumFractionDigits: 1, style: "percent" }),
			canvas.width - paddingPixels,
			canvas.height - paddingPixels,
		);
	} else {
		context.fillStyle = "#0009";
		context.fillText(
			progress.toLocaleString("en-us", { maximumFractionDigits: 1, style: "percent" }),
			paddingPixels,
			canvas.height - paddingPixels,
		);
	}
	return [{ attachment: canvas.toBuffer("image/png"), name: "progress.png" }];
}
