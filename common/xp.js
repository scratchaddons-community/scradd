import { extractData, getDatabases, queueDatabaseWrite } from "./databases.js";

export const NORMAL_XP_PER_MESSAGE = 5;
/** @type {undefined | import("discord.js").Message} */
let database;
/** @param {import("discord.js").User} user */
export default async function giveXp(user, amount = NORMAL_XP_PER_MESSAGE) {
	const guild = await user.client.guilds.fetch(process.env.GUILD_ID || "");
	const modTalk = guild.publicUpdatesChannel;
	if (!modTalk) throw new ReferenceError("Could not find mod talk");

	database ||= (await getDatabases(["xp"], modTalk)).xp;

	const xp = /** @type {{ user: string; xp: number }[]} */ (await extractData(database));
	const index = xp.findIndex((entry) => entry.user === user.id);
	if (index === -1) {
		xp.push({ user: user.id, xp: amount });
	} else {
		xp[index] = { user: user.id, xp: (xp[index]?.xp || 0) + amount };
	}

	queueDatabaseWrite(database, xp);
}
