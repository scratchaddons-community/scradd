import type { Snowflake } from "discord.js";
import Database from "../../common/database.js";

export const xpDatabase = new Database<{
	/** The ID of the user. */
	user: Snowflake;
	/** How much XP they have. */
	xp: number;
}>("xp");
export const recentXpDatabase = new Database<{
	/** The ID of the user. */
	user: Snowflake;
	/** How much XP they gained. */
	xp: number;
	time: number;
}>("recent_xp");

await xpDatabase.init();
await recentXpDatabase.init();

export function getWeeklyXp(user: Snowflake) {
	return recentXpDatabase.data.reduce((accumulator, gain) => {
		if (gain.user !== user || gain.time + 604_800_000 < Date.now()) return accumulator;
		accumulator += gain.xp;
		return accumulator;
	}, 0);
}

export function getFullWeeklyData() {
	return Object.entries(
		recentXpDatabase.data.reduce<Record<Snowflake, number>>((accumulator, gain) => {
			if (gain.time + 604_800_000 < Date.now()) return accumulator;

			accumulator[gain.user] = (accumulator[gain.user] ?? 0) + gain.xp;
			return accumulator;
		}, {}),
	)
		.map((entry) => ({ xp: entry[1], user: entry[0] }))
		.filter((entry) => entry.xp > 0)
		.toSorted((one, two) => two.xp - one.xp);
}
