import { EmbedBuilder, GuildMember, User } from "discord.js";
import client, { guild } from "../client.js";
import { userSettingsDatabase } from "../commands/settings.js";
import { nth } from "../lib/numbers.js";
import CONSTANTS from "./CONSTANTS.js";
import Database from "./database.js";
import breakRecord from "./records.js";

export const xpDatabase = new Database("xp");
export const hourlyDatabase = new Database("recent_xp");
await xpDatabase.init();
await hourlyDatabase.init();

export const NORMAL_XP_PER_MESSAGE = 5;

/** @param {User | GuildMember} to */
export default async function giveXp(to, amount = NORMAL_XP_PER_MESSAGE) {
	// give the xp
	const user = to instanceof User ? to : to.user;
	const member =
		user instanceof GuildMember ? user : await guild.members.fetch(user).catch(() => {});

	const xp = xpDatabase.data;
	const index = xp.findIndex((entry) => entry.user === user.id);
	const oldXp = xp[index]?.xp || 0;
	const newXp = oldXp + amount;

	if (index === -1) {
		xp.push({ user: user.id, xp: amount });
	} else {
		xp[index] = { user: user.id, xp: newXp };
	}
	xpDatabase.data = xp;

	// send level up message
	const oldLevel = getLevelForXp(oldXp);
	const newLevel = getLevelForXp(newXp);
	if (oldLevel !== newLevel) {
		const date = new Date();
		const nextLevelXp = getXpForLevel(newLevel + 1);
		const pings =
			userSettingsDatabase.data.find(({ user }) => user === to.id)?.levelUpPings ?? true;
		await CONSTANTS.channels.bots?.send({
			content: "🎉" + (pings ? " " + to.toString() : ""),
			embeds: [
				new EmbedBuilder()
					.setColor(member?.displayColor ?? null)
					.setAuthor({
						iconURL: to.displayAvatarURL(),
						name: member?.displayName ?? user.username,
					})
					.setTitle("A member leveled up!")
					.setDescription(
						`${to.toString()}**${
							date.getUTCMonth() === 3 && date.getUTCDate() === 1
								? ", You've at" // april fools
								: " has reached"
						} level ${newLevel}!** (${newXp.toLocaleString()}/${getXpForLevel(
							newLevel,
						).toLocaleString()} XP)\nNext level: ${(
							nextLevelXp - newXp
						).toLocaleString()}/${nextLevelXp.toLocaleString()} XP remaining`,
					)
					.setFooter({
						text: `View the leaderboard with /xp top${CONSTANTS.footerSeperator}View someone’s XP with /xp rank`,
					}),
			],
		});
	}

	// Give them epic people
	const rank = xp.sort((one, two) => two.xp - one.xp).findIndex((info) => info.user === user.id);

	if (
		CONSTANTS.roles.epic && // the role must exist
		// in addition, they must:
		rank / xp.length < 0.01 && // be in the top 1%
		member && // be in the server
		!member.roles.resolve(CONSTANTS.roles.epic.id) // not have the role
	) {
		await member.roles.add(CONSTANTS.roles.epic);
		await CONSTANTS.channels.bots?.send(
			`🎊 ${member.toString()} Congratulations on being in the top 1% of the leaderboard! You have earned ${CONSTANTS.roles.epic.toString()}.`,
		);
	}

	// Update recent DB & send weekly winners
	const { weekly, hourly } = hourlyDatabase.data.reduce(
		({ weekly, hourly }, gain) => {
			if (gain.time + 3_600_000 > Date.now()) {
				hourly.push(gain);
			} else {
				weekly[gain.user] ??= 0;
				weekly[gain.user] += gain.xp;
			}
			return { weekly, hourly };
		},
		{
			/** @type {{ [key: import("discord.js").Snowflake]: number }} */
			weekly: {},
			/** @type {typeof hourlyDatabase["data"]} */
			hourly: [],
		},
	);
	const weeklyArray = Object.entries(weekly).map(([user, xp]) => ({ user, xp, time: 0 }));

	const threads = CONSTANTS.channels.announcements?.threads;

	const thread = /** @type {undefined | import("discord.js").PublicThreadChannel} */ (
		(await threads?.fetchActive())?.threads.find(({ name }) => name === "Weekly Winners") ||
			(await threads?.create({ name: "Weekly Winners" }))
	);

	const date = new Date();
	if (
		+new Date() - +new Date(hourlyDatabase.extra || 1_662_854_400_000) > 604_800_000 && // More than a week since last weekly
		weeklyArray.length
	) {
		hourlyDatabase.data = [...hourly, { user: to.id, xp: amount, time: Date.now() }];
		hourlyDatabase.extra = Date.now() + "";
		const sorted = weeklyArray.sort((a, b) => b.xp - a.xp);
		sorted.splice(5);
		date.setUTCDate(date.getUTCDate() - 7);
		await thread?.send({
			allowedMentions: {
				users: sorted
					.map((gain) => gain.user)
					.filter(
						(user) =>
							userSettingsDatabase.data.find((settings) => user === settings.user)
								?.weeklyPings ?? true,
					),
			},
			content:
				`__**Weekly Winners week of ${
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
					][date.getUTCMonth()]
				} ${nth(date.getUTCDate(), { bold: false, jokes: false })}**__\n` +
				sorted
					.map(
						(gain, index) =>
							`${["🥇", "🥈", "🥉"][index] || "🏅"} <@${
								gain.user
							}> - ${gain.xp.toLocaleString()} XP`,
					)
					.join("\n"),
		});

		const role = CONSTANTS.roles.weekly_winner;
		const ids = sorted.map(({ user }) => user);
		if (role) {
			await Promise.all([
				...role.members.map((member) => {
					if (!ids.includes(member.id)) return member.roles.remove(role);
				}),
				...sorted.map(({ user }) =>
					guild.members.fetch(user).then((member) => member.roles.add(role)),
				),
			]);
		}
	} else {
		hourlyDatabase.data = [
			...hourly,
			...weeklyArray,
			{ user: to.id, xp: amount, time: Date.now() },
		];
	}

	const hourlyByUser = hourly.reduce(
		(acc, gain) => {
			acc[gain.user] ??= 0;
			acc[gain.user] += gain.xp;

			return acc;
		},
		/** @type {{ [key: import("discord.js").Snowflake]: number }} */
		({}),
	);

	const topInHour = Object.entries(hourlyByUser).sort(([, a], [, b]) => b - a)[0];
	if (topInHour && thread) {
		const user = await client.users.fetch(topInHour[0]).catch(() => {});
		if (user) await breakRecord(2, [user], topInHour[1], thread);
	}
}

const XP_PER_LEVEL = [
	0, 50, 100, 250, 500, 1_000, 1_500, 2_000, 2_500, 3_250, 4_000, 5_000, 6_000, 7_250, 8_500,
	10_000, 11_500, 13_000, 15_000, 17_000, 19_000, 21_000, 23_500, 26_000, 28_500, 31_000, 34_000,
	37_000, 40_000, 43_000, 46_500, 50_000, 53_500, 57_000, 61_000, 65_000, 70_000, 75_000, 80_000,
	85_000, 90_000, 95_000, 100_000, 105_000, 110_000, 115_000, 122_500, 130_000, 137_500, 145_000,
	152_500, 160_000, 167_500, 175_000, 185_000, 195_000, 205_000, 215_000, 225_000, 235_000,
	245_000, 255_000, 265_000, 275_000, 285_000, 295_000, 305_000, 315_000, 325_000, 335_420,
	350_000, 362_500, 375_000, 387_500, 400_000, 412_500, 425_000, 437_500, 450_000, 462_500,
	475_000, 487_500, 500_000, 515_000, 530_000, 545_000, 560_000, 575_000, 590_000, 605_000,
];

// const INCREMENT_FREQUENCY = 10;

// /**
//  * @param {number} level
//  *
//  * @returns {number}
//  */
// function getIncrementForLevel(level) {
// 	const xpForLevel = XP_PER_LEVEL[level];
// 	const xpForPreviousLevel = XP_PER_LEVEL[level - 1];

// 	if (xpForLevel !== undefined && xpForPreviousLevel !== undefined) {
// 		return xpForLevel - xpForPreviousLevel;
// 	}
// 	if (level % INCREMENT_FREQUENCY === 0) {
// 		const x = (level - XP_PER_LEVEL.length) / INCREMENT_FREQUENCY + 3;
// 		// Credit to idkhow2type (and Jazza 😉) on the SA Discord for the following line
// 		return ((x % 9) + 1) * 10 ** Math.floor(x / 9) * 5_000;
// 	}
// 	return getIncrementForLevel(Math.floor(level / INCREMENT_FREQUENCY) * INCREMENT_FREQUENCY);
// }

/**
 * @param {number} level
 *
 * @returns {number}
 */
export function getXpForLevel(level) {
	const xpForLevel = XP_PER_LEVEL[level];
	if (xpForLevel !== undefined) return xpForLevel;
	throw new RangeError("Asked for XP for level " + level);
	// return getXpForLevel(level - 1) + getIncrementForLevel(level);
}

/** @param {number} xp */
export function getLevelForXp(xp) {
	let level = XP_PER_LEVEL.findIndex((found) => found > xp) - 1;
	if (level === -2) {
		let found = 0;
		level = XP_PER_LEVEL.length;
		while (!(found > xp)) {
			found = getXpForLevel(level);
			level++;
		}
	}
	return level;
}
