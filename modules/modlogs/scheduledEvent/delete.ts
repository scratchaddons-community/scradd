import client from "../../../client.js";
import CONSTANTS from "../../../common/CONSTANTS.js";
import log from "../../../modules/modlogs/logging.js";

import type Event from "../../../common/types/event";

const event: Event<"guildScheduledEventDelete"> = async function event(event) {
	const guild = event.guild ?? (await client.guilds.fetch(event.guildId));
	if (guild.id !== CONSTANTS.guild.id) return;

	await log(`📅 Event ${event.name} removed!`, "voice");
};
export default event;
