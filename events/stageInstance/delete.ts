import client from "../../client.js";
import CONSTANTS from "../../common/CONSTANTS.js";
import log from "../../common/logging.js";
import type Event from "../../common/types/event";

/** No idea why we need this but for some reason we do. */
const ALREADY_ENDED = new Set();

const event: Event<"stageInstanceCreate"> = async function event(instance) {
	const guild = instance.guild || (await client.guilds.fetch(instance.guildId));
	if (guild.id !== CONSTANTS.guild.id || ALREADY_ENDED.has(instance.id)) return;
	ALREADY_ENDED.add(instance.id);
	await log(`📷 Stage ${instance.channel?.toString()} is no longer live!`, "voice");
};
export default event;
