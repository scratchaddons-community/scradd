import { GuildMember, time, TimestampStyles, User } from "discord.js";

import { userSettingsDatabase } from "../commands/settings.js";
import { nth } from "../util/numbers.js";
import CONSTANTS from "./CONSTANTS.js";
import Database from "./database.js";

export const xpDatabase = new Database("xp");
export const weeklyXpDatabase = new Database("recent_xp");

await xpDatabase.init();
await weeklyXpDatabase.init();

export const DEFAULT_XP = 5;

const XP_PER_LEVEL = [
	0, 50, 100, 300, 500, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 6000, 7000, 8500, 10_000,
	11_500, 13_000, 15_000, 17_000, 19_000, 21_000, 23_000, 25_000, 28_000, 31_000, 34_000, 37_000,
	40_000, 43_000, 46_000, 49_000, 53_000, 57_000, 61_000, 65_000, 69_000, 73_000, 77_000, 81_000,
	85_000, 90_000, 95_000, 100_000, 105_000, 110_000, 115_000, 122_500, 130_000, 137_500, 145_000,
	152_500, 160_000, 170_000, 180_000, 190_000, 200_000, 210_000, 220_000, 230_000, 240_000,
	250_000, 261_500, 273_000, 284_500, 296_000, 307_500, 319_000, 330_500, 342_069, 354_000,
	365_000, 376_000, 387_000, 400_000, 413_000, 426_000, 440_000, 455_000, 470_000, 485_000,
	500_000, 515_000, 530_000, 545_000, 560_000, 575_000, 590_000,
];

const INCREMENT_FREQUENCY = 10;

/**
 * Get the difference between the XP required for a level and its predecessor.
 *
 * @param {number} level - The level to get the increment for.
 *
 * @returns {number} - The increment.
 */
function getIncrementForLevel(level) {
	const xpForLevel = XP_PER_LEVEL[level];
	const xpForPreviousLevel = XP_PER_LEVEL[level - 1];

	if (xpForLevel !== undefined && xpForPreviousLevel !== undefined)
		return xpForLevel - xpForPreviousLevel;

	if (level % INCREMENT_FREQUENCY === 0) {
		const number = (level - XP_PER_LEVEL.length) / INCREMENT_FREQUENCY + 3;

		// Credit to idkhow2type (and Jazza 😉) on the SA Discord for the following line
		return ((number % 9) + 1) * 10 ** Math.floor(number / 9) * 5000;
	}

	return getIncrementForLevel(Math.floor(level / INCREMENT_FREQUENCY) * INCREMENT_FREQUENCY);
}

/**
 * Get the needed amount of XP to reach the given level.
 *
 * @param {number} level - The level.
 *
 * @returns {number} - The needed XP.
 */
export function getXpForLevel(level) {
	const xpForLevel = XP_PER_LEVEL[level];

	if (xpForLevel !== undefined) return xpForLevel;

	return getXpForLevel(level - 1) + getIncrementForLevel(level);
}

/**
 * Get the corresponding level of an XP value.
 *
 * @param {number} xp - The XP value.
 *
 * @returns {number} The corresponding level.
 */
export function getLevelForXp(xp) {
	let level = XP_PER_LEVEL.findIndex((found) => found > xp) - 1;

	if (level === -2) {
		let found = 0;

		level = XP_PER_LEVEL.length;

		while (found < xp) {
			found = getXpForLevel(level);
			level++;
		}
	}

	return level;
}

/**
 * Give XP to a user.
 *
 * @param {User | GuildMember} to - Who to give the XP to.
 * @param {string} [url] - A link to a message or other that gave them this XP.
 * @param {number} amount - How much XP to give.
 */
export default async function giveXp(to, url, amount = DEFAULT_XP) {
	// Give the xp
	const user = to instanceof User ? to : to.user;
	const member =
		user instanceof GuildMember
			? user
			: await CONSTANTS.guild.members.fetch(user).catch(() => {});

	const xp = Array.from(xpDatabase.data);
	const xpDatabaseIndex = xp.findIndex((entry) => entry.user === user.id);
	const oldXp = xp[xpDatabaseIndex]?.xp || 0;
	const newXp = oldXp + amount;

	if (xpDatabaseIndex === -1) xp.push({ user: user.id, xp: amount });
	else xp[xpDatabaseIndex] = { user: user.id, xp: newXp };

	xpDatabase.data = xp;

	// Send level up message
	const oldLevel = getLevelForXp(oldXp);
	const newLevel = getLevelForXp(newXp);
	const date = new Date();

	if (oldLevel < newLevel) {
		const nextLevelXp = getXpForLevel(newLevel + 1);
		const pings =
			userSettingsDatabase.data.find((settings) => settings.user === to.id)?.levelUpPings ??
			process.env.NODE_ENV === "production";

		await CONSTANTS.channels.bots?.send({
			allowedMentions: pings ? undefined : { users: [] },
			content: `🎉${to.toString()}`,

			embeds: [
				{
					color: member?.displayColor,

					author: {
						icon_url: (member ?? user).displayAvatarURL(),
						name: member?.displayName ?? user.username,
					},

					title: `You${
						date.getUTCMonth() === 3 && date.getUTCDate() === 1
							? "'v" // April fools
							: "’r"
					}e at level ${newLevel}!`,

					url,

					fields: [
						{
							name: "✨ Current XP",
							value: `${Math.floor(newXp).toLocaleString()} XP`,
							inline: true,
						},
						{
							name: CONSTANTS.zeroWidthSpace,
							value: CONSTANTS.zeroWidthSpace,
							inline: true,
						},
						{
							name: "⬆ Next level",
							value: `${nextLevelXp.toLocaleString()} XP`,
							inline: true,
						},
					],

					footer: {
						icon_url: CONSTANTS.guild.iconURL() ?? undefined,
						text: "View the leaderboard with /xp top\nView someone’s XP with /xp rank\nToggle pings with /settings",
					},
				},
			],
		});
	}

	// Give them epic people
	const rank = xp.sort((one, two) => two.xp - one.xp).findIndex((info) => info.user === user.id);

	if (
		CONSTANTS.roles.epic && // The role must exist
		// in addition, they must:
		rank / xp.length < 0.01 && // Be in the top 1%
		member && // Be in the server
		!member.roles.resolve(CONSTANTS.roles.epic.id) // Not have the role
	) {
		await member.roles.add(CONSTANTS.roles.epic, "Top 1% of the XP leaderboard");
		await CONSTANTS.channels.bots?.send(
			`🎊 ${member.toString()} Congratulations on being in the top 1% of the leaderboard! You have earned ${CONSTANTS.roles.epic.toString()}.`,
		);
	}

	// Update recent DB
	const weekly = Array.from(weeklyXpDatabase.data);
	const weeklyIndex = weekly.findIndex((entry) => entry.user === user.id);
	const weeklyAmount = (weekly[weeklyIndex]?.xp || 0) + amount;

	if (weeklyIndex === -1) weekly.push({ user: user.id, xp: weeklyAmount });
	else weekly[weeklyIndex] = { user: user.id, xp: weeklyAmount };

	weeklyXpDatabase.data = weekly;

	const nextWeeklyDate = Number(weeklyXpDatabase.extra ?? 0) + 604_800_000;

	// Send weekly winners
	if (Number(date) < nextWeeklyDate) return;

	// More than a week since last weekly
	weeklyXpDatabase.extra = String(nextWeeklyDate);

	const sorted = weekly.sort((one, two) => two.xp - one.xp);
	const { active } = CONSTANTS.roles;

	const activeMembers = sorted.filter((item) => item.xp > 350);

	if (active) {
		await Promise.all([
			...active.members.map(async (roleMember) => {
				if (activeMembers.some((item) => item.user === roleMember.id))
					return await roleMember.roles.remove(active, "Inactive");
			}),
			...activeMembers.map(
				async ({ user: memberId }) =>
					await CONSTANTS.guild.members
						.fetch(memberId)
						.catch(() => {})
						.then((activeMember) => activeMember?.roles.add(active, "Active")),
			),
		]);
	}

	weeklyXpDatabase.data = [];

	sorted.splice(
		sorted.findIndex((gain, index) => index > 3 && gain.xp !== sorted[index + 1]?.xp) + 1,
	);

	const ids = sorted.map((gain) => (typeof gain === "string" ? gain : gain.user));

	date.setUTCDate(date.getUTCDate() - 7);
	await CONSTANTS.channels.announcements?.send({
		allowedMentions: {
			users: ids.filter(
				(id) =>
					userSettingsDatabase.data.find((settings) => id === settings.user)
						?.weeklyPings ?? process.env.NODE_ENV === "production",
			),
		},

		content: `__**Weekly Winners week of ${
			[
				"January",
				"February",
				"March",
				"April",
				"May",
				"June",
				"July",
				"August",
				"September",
				"October",
				"November",
				"December",
			][date.getUTCMonth()] || ""
		} ${nth(date.getUTCDate(), { bold: false, jokes: false })}**__\n${
			sorted
				.map(
					(gain, index) =>
						`${["🥇", "🥈", "🥉"][index] || "🏅"} <@${gain.user}> - ${Math.floor(
							gain.xp,
						).toLocaleString()} XP`,
				)
				.join("\n") || "*Nobody got any XP this week!*"
		}\n\n*This week, ${weekly.length.toLocaleString()} people chatted, and ${activeMembers.length.toLocaleString()} people were active. Altogether, people gained ${Math.floor(
			weekly.reduce((one, two) => one + two.xp, 0),
		).toLocaleString()} XP this week.*\n__Next week's weekly winners will be posted ${time(
			Math.round((nextWeeklyDate + 604_800_000) / 1000),
			TimestampStyles.RelativeTime,
		)}.__`,
	});

	const role = CONSTANTS.roles.weekly_winner;

	if (role) {
		await Promise.all([
			...role.members.map(async (weeklyMember) => {
				if (!ids.includes(weeklyMember.id))
					return await weeklyMember.roles.remove(role, "No longer weekly winner");
			}),
			...sorted.map(
				async ({ user: userId }, index) =>
					await CONSTANTS.guild.members
						.fetch(userId)
						.catch(() => {})
						.then((member) =>
							member?.roles.add(
								index || !CONSTANTS.roles.epic
									? role
									: [role, CONSTANTS.roles.epic],
								"Weekly winner",
							),
						),
			),
		]);
	}
}
