import client from "../../client.js";
import log from "../../common/moderation/logging.js";

/** No idea why we need this but for some reason we do. */
const ALREADY_ENDED = new Set();

/** @type {import("../../common/types/event").default<"stageInstanceCreate">} */
export default async function event(instance) {
	const guild = instance.guild || (await client.guilds.fetch(instance.guildId));
	if (guild.id !== process.env.GUILD_ID || ALREADY_ENDED.has(instance.id)) return;
	ALREADY_ENDED.add(instance.id);
	await log(`📷 Stage ${instance.channel?.toString()} is no longer live!`, "voice");
}
