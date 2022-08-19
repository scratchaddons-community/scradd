import { EmbedBuilder, GuildMember, User } from "discord.js";
import { guild } from "../client.js";
import CONSTANTS from "./CONSTANTS.js";
import { extractData, getDatabases, queueDatabaseWrite } from "./databases.js";

export const NORMAL_XP_PER_MESSAGE = 5;

/** @param {User | GuildMember} to */
export async function giveXp(to, amount = NORMAL_XP_PER_MESSAGE) {
	const user = to instanceof User ? to : to.user;
	const member =
		user instanceof GuildMember ? user : await guild.members.fetch(user).catch(() => {});

	const database = (await getDatabases(["xp"])).xp;

	const xp = /** @type {{ user: import("discord.js").Snowflake; xp: number }[]} */ (await extractData(database));
	const index = xp.findIndex((entry) => entry.user === user.id);
	const oldXp = xp[index]?.xp || 0;
	if (index === -1) {
		xp.push({ user: user.id, xp: amount });
	} else {
		const newXp = oldXp + amount;
		xp[index] = { user: user.id, xp: newXp };
		const oldLevel = getLevelForXp(oldXp);
		const newLevel = getLevelForXp(newXp);
		if (oldLevel !== newLevel) {
			const bots = await guild.channels.fetch(process.env.BOTS_CHANNEL || "");
			const date = new Date();
			if (bots?.isTextBased())
				await bots.send({
					content: "🎉 " + to.toString(),
					embeds: [
						new EmbedBuilder()
							.setColor(member?.displayColor ?? null)
							.setAuthor({
								iconURL: to.displayAvatarURL(),
								name: member?.displayName ?? user.username,
							})
							.setTitle("A member leveled up!")
							.setDescription(
								`${to.toString()}${
									date.getUTCMonth() === 4 && date.getUTCDate() === 1
										? ", You've at"
										: " has reached"
								} level ${newLevel}! (${newXp.toLocaleString()}/${getXpForLevel(
									newLevel,
								).toLocaleString()} XP)\nNext level: Level ${newLevel + 1}; ${(
									getXpForLevel(newLevel + 1) - newXp
								).toLocaleString()} XP remaining`,
							)
							.setFooter({
								text: `View the leaderboard with /xp top${CONSTANTS.footerSeperator}View someone’s XP with /xp rank`,
							}),
					],
				});
			else throw new TypeError("Could not find bots channel");
		}
	}

	queueDatabaseWrite(database, xp);
}

const XP_PER_LEVEL = [
	0, 50, 100, 250, 500, 1_000, 1_500, 2_000, 2_500, 3_250, 4_000, 5_000, 6_000, 7_250, 8_500,
	10_000, 11_500, 13_000, 15_000, 17_000, 19_000, 21_000, 23_500, 26_000, 28_500, 31_000, 34_000,
	37_000, 40_000, 43_000, 46_500, 50_000, 53_500, 57_000, 61_000, 65_000, 70_000, 75_000, 80_000,
	85_000, 90_000, 95_000, 100_000, 105_000, 110_000, 115_000, 122_500, 130_000, 137_500, 145_000,
	152_500, 160_000, 167_500, 175_000, 185_000, 195_000, 205_000, 215_000, 225_000, 235_000,
	245_000, 255_000, 265_000, 275_000, 285_000, 295_000, 305_000, 315_000, 325_000, 336_969,
	350_000, 362_500, 375_000, 387_500, 400_000, 412_500, 425_000, 437_500, 450_000, 462_500,
	475_000, 487_500, 500_000, 515_000, 530_000, 545_000, 560_000, 575_000, 590_000, 605_000,
];

const INCREMENT_FREQUENCY = 10;

/**
 * @param {number} level
 *
 * @returns {number}
 */
function getIncrementForLevel(level) {
	if (level < XP_PER_LEVEL.length) {
		return (XP_PER_LEVEL[level] || 0) - (XP_PER_LEVEL[level - 1] || 0);
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
	return XP_PER_LEVEL[level] ?? getXpForLevel(level - 1) + getIncrementForLevel(level);
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
