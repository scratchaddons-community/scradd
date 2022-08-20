import client from "../../../client.js";
import log from "../../../common/moderation/logging.js";

/** @type {import("../../../types/event").default<"stageInstanceUpdate">} */
export default async function event(oldInstance, newInstance) {
	const guild = newInstance.guild || (await client.guilds.fetch(newInstance.guildId));
	if (!oldInstance || guild.id !== process.env.GUILD_ID) return;

	const logs = [];

	if (oldInstance.topic !== newInstance.topic) {
		logs.push(`’s topic set to ${newInstance.topic}`);
	}

	await Promise.all(
		logs.map((edit) => log(`✏ Stage ${newInstance.channel?.toString()}` + edit + `!`, "voice")),
	);
}
