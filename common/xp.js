import { Collection, GuildMember, time, TimestampStyles, User } from "discord.js";
import { setTimeout as sleep } from "timers/promises";

import { userSettingsDatabase } from "../commands/settings.js";
import { nth } from "../util/numbers.js";
import CONSTANTS from "./CONSTANTS.js";
import Database, { DATABASE_THREAD } from "./database.js";
import { getLoggingThread } from "./logging.js";

export const xpDatabase = new Database("xp");
export const weeklyXpDatabase = new Database("recent_xp");
await xpDatabase.init();
await weeklyXpDatabase.init();

export const DEFAULT_XP = 5;

/**
 * @param {User | GuildMember} to
 * @param {string} [url]
 */
export default async function giveXp(to, url, amount = DEFAULT_XP) {
	// give the xp
	const user = to instanceof User ? to : to.user;
	const member =
		user instanceof GuildMember
			? user
			: await CONSTANTS.guild.members.fetch(user).catch(() => {});

	const xp = [...xpDatabase.data];
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
	const date = new Date();
	if (oldLevel < newLevel) {
		const nextLevelXp = getXpForLevel(newLevel + 1);
		const pings =
			userSettingsDatabase.data.find(({ user }) => user === to.id)?.levelUpPings ??
			process.env.NODE_ENV === "production";
		await CONSTANTS.channels.bots?.send({
			allowedMentions: pings ? undefined : { users: [] },
			content: "🎉" + to.toString(),
			embeds: [
				{
					color: member?.displayColor,
					author: {
						icon_url: (member ?? user).displayAvatarURL(),
						name: member?.displayName ?? user.username,
					},
					title: `You${
						date.getUTCMonth() === 3 && date.getUTCDate() === 1
							? "'v" // april fools
							: "’r"
					}e at level ${newLevel}!`,
					url,

					fields: [
						{
							name: "✨ Current XP",
							value: Math.floor(newXp).toLocaleString() + " XP",
							inline: true,
						},
						{
							name: CONSTANTS.zeroWidthSpace,
							value: CONSTANTS.zeroWidthSpace,
							inline: true,
						},
						{
							name: "⬆ Next level",
							value: nextLevelXp.toLocaleString() + " XP",
							inline: true,
						},
					],
					footer: {
						icon_url: CONSTANTS.guild.iconURL() ?? undefined,
						text: `View the leaderboard with /xp top\nView someone’s XP with /xp rank\nToggle pings with /settings`,
					},
				},
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
		await member.roles.add(CONSTANTS.roles.epic, "Top 1% of the XP leaderboard");
		await CONSTANTS.channels.bots?.send(
			`🎊 ${member.toString()} Congratulations on being in the top 1% of the leaderboard! You have earned ${CONSTANTS.roles.epic.toString()}.`,
		);
	}

	// Update recent DB
	const weekly = [...weeklyXpDatabase.data];
	const weeklyIndex = weekly.findIndex((entry) => entry.user === user.id);
	const weeklyAmount = (weekly[weeklyIndex]?.xp || 0) + amount;

	if (weeklyIndex === -1) {
		weekly.push({ user: user.id, xp: weeklyAmount });
	} else {
		weekly[weeklyIndex] = { user: user.id, xp: weeklyAmount };
	}
	weeklyXpDatabase.data = weekly;
	const nextWeeklyDate = +(weeklyXpDatabase.extra ?? 0) + 604_800_000;

	//send weekly winners
	if (+date < nextWeeklyDate) return;

	// More than a week since last weekly
	weeklyXpDatabase.extra = nextWeeklyDate + "";
	const sorted = [...weekly.sort((a, b) => b.xp - a.xp)];
	const active = CONSTANTS.roles.active;
	let activeCount = 0;
	if (active) {
		await Promise.all([
			...active.members.map((member) => {
				if ((sorted.find((item) => item.user === member.id)?.xp || 0) < 350)
					return member.roles.remove(active, "Inactive");
			}),
			...sorted.map(({ user, xp }) => {
				if (xp >= 350) {
					activeCount++;
					return CONSTANTS.guild.members
						.fetch(user)
						.catch(() => {})
						.then((member) => member?.roles.add(active, "Active"));
				}
			}),
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
				(user) =>
					userSettingsDatabase.data.find((settings) => user === settings.user)
						?.weeklyPings ?? process.env.NODE_ENV === "production",
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
			(sorted
				.map(
					(gain, index) =>
						`${["🥇", "🥈", "🥉"][index] || "🏅"} <@${gain.user}> - ${Math.floor(
							gain.xp,
						).toLocaleString()} XP`,
				)
				.join("\n") || "*Nobody got any XP this week!*") +
			`\n\n*This week, ${weekly.length.toLocaleString()} people chatted, and ${activeCount.toLocaleString()} people were active. Altogether, people gained ${Math.floor(
				weekly.reduce((a, b) => a + b.xp, 0),
			).toLocaleString()} XP this week.*\n__Next week's weekly winners will be posted ${time(
				Math.round((nextWeeklyDate + 604_800_000) / 1000),
				TimestampStyles.RelativeTime,
			)}.__`,
	});

	const role = CONSTANTS.roles.weekly_winner;
	if (role) {
		await Promise.all([
			...role.members.map((member) => {
				if (!ids.includes(member.id))
					return member.roles.remove(role, "No longer weekly winner");
			}),
			...sorted.map(({ user }, index) =>
				CONSTANTS.guild.members
					.fetch(user)
					.catch(() => {})
					.then((member) =>
						member?.roles.add(
							index || !CONSTANTS.roles.epic ? role : [role, CONSTANTS.roles.epic],
							"Weekly winner",
						),
					),
			),
		]);
	}

	if (date.getUTCDate() === 25 && process.env.NODE_ENV === "production") {
		// Remove before July lmao
		const channel = await CONSTANTS.guild.channels.fetch("806605043817644074");
		if (!channel?.isTextBased()) return;
		await channel.sendTyping();
		const message = await channel.messages.fetch("1056560467444781077");

		// Find all reactions with the emoji you want
		const reaction = message.reactions.valueOf().find((r) => r.emoji.name === "🎉");
		if (!reaction) return;
		let users = new Collection();
		while (users.size % 100 === 0)
			users = users.concat(
				await reaction.users.fetch({ limit: 100, after: users.lastKey() }),
			);

		const members = await Promise.all(
			users.map((user) => CONSTANTS.guild.members.fetch(user.id).catch(() => {})),
		);

		const pool = members
			.map((user, index) => {
				if (!user) return [];
				const topIndex = weekly.findIndex((found) => user.id === found.user);

				return Array(
					topIndex === -1
						? 1
						: Math.ceil(
								((members.length - index) / 90 +
									Math.min((weekly[topIndex]?.xp ?? 0) / 90, 10)) /
									(user instanceof GuildMember &&
									user.roles.resolve("806623480937447455")
										? 5
										: 1),
						  ),
				).fill(user.id);
			})
			.flat();

		await channel.send("👀");
		await channel.sendTyping();

		await (
			await getLoggingThread(DATABASE_THREAD)
		).send({
			files: [
				{
					attachment: Buffer.from(JSON.stringify(weekly), "utf8"),
					name: "weekly.json",
				},
				{
					attachment: Buffer.from(JSON.stringify(pool), "utf8"),
					name: "pool.json",
				},
			],
		});

		await sleep(Math.random() * 1000);
		await channel.send(CONSTANTS.emojis.discord.typing);
		const index = Math.round(Math.random() * pool.length);
		await channel.sendTyping();
		await sleep(Math.random() * 4000 + 1000);
		await channel.sendTyping();
		await sleep(Math.random() * 4000 + 1000);
		await channel.send(
			`Congrats <@${pool[index]}>! You won **a month of Nitro**! DM <@771422735486156811> to claim your prize.`,
		);

		// IF ANYONE IS READING THIS, PLEASE DON'T TELL ANYONE THAT THIS IS HERE, IN ANY WAY, SHAPE, OR FORM. IT'S A SURPRISE. TY!
		await channel.sendTyping();
		await sleep(Math.random() * 1000 + 2000);
		await channel.send("And...");
		await channel.sendTyping();
		pool.splice(index, 1);
		await sleep(Math.random() * 5000 + 5000);
		await channel.sendTyping();
		await sleep(Math.random() * 5000 + 5000);
		await channel.sendTyping();
		await sleep(Math.random() * 5000 + 5000);
		await channel.sendTyping();
		await channel.send(
			`Surprise! Congrats to <@${
				pool[Math.round(Math.random() * pool.length)]
			}> as well! You won **a month of Nitro *Basic***! DM <@771422735486156811> to claim your prize.`,
		);
	}
}

const XP_PER_LEVEL = [
	0, 50, 100, 300, 500, 1_000, 1_500, 2_000, 2_500, 3_000, 4_000, 5_000, 6_000, 7_000, 8_500,
	10_000, 11_500, 13_000, 15_000, 17_000, 19_000, 21_000, 23_000, 25_000, 28_000, 31_000, 34_000,
	37_000, 40_000, 43_000, 46_000, 49_000, 53_000, 57_000, 61_000, 65_000, 69_000, 73_000, 77_000,
	81_000, 85_000, 90_000, 95_000, 100_000, 105_000, 110_000, 115_000, 122_500, 130_000, 137_500,
	145_000, 152_500, 160_000, 170_000, 180_000, 190_000, 200_000, 210_000, 220_000, 230_000,
	240_000, 250_000, 261_500, 273_000, 284_500, 296_000, 307_500, 319_000, 330_500, 342_069,
	354_000, 365_000, 376_000, 387_000, 400_000, 413_000, 426_000, 440_000, 455_000, 470_000,
	485_000, 500_000, 515_000, 530_000, 545_000, 560_000, 575_000, 590_000,
];

const INCREMENT_FREQUENCY = 10;

/**
 * @param {number} level
 *
 * @returns {number}
 */
function getIncrementForLevel(level) {
	const xpForLevel = XP_PER_LEVEL[level];
	const xpForPreviousLevel = XP_PER_LEVEL[level - 1];

	if (xpForLevel !== undefined && xpForPreviousLevel !== undefined) {
		return xpForLevel - xpForPreviousLevel;
	}
	if (level % INCREMENT_FREQUENCY === 0) {
		const x = (level - XP_PER_LEVEL.length) / INCREMENT_FREQUENCY + 3;
		// Credit to idkhow2type (and Jazza 😉) on the SA Discord for the following line
		return ((x % 9) + 1) * 10 ** Math.floor(x / 9) * 5_000;
	}
	return getIncrementForLevel(Math.floor(level / INCREMENT_FREQUENCY) * INCREMENT_FREQUENCY);
}

/**
 * @param {number} level
 *
 * @returns {number}
 */
export function getXpForLevel(level) {
	const xpForLevel = XP_PER_LEVEL[level];
	if (xpForLevel !== undefined) return xpForLevel;

	return getXpForLevel(level - 1) + getIncrementForLevel(level);
}

/** @param {number} xp */
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
