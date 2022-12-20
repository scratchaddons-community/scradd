import CONSTANTS from "../common/CONSTANTS.js";
import log from "../common/logging.js";

import type Event from "../common/types/event";

const event: Event<"webhookUpdate"> = async function event(channel) {
	if (channel.guild.id !== CONSTANTS.guild.id) return;

	await log(`🌐 Webhooks updated in ${channel.toString()}!`, "channels");
};
export default event;
