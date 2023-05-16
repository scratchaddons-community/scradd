import config from "../../common/config.js";
import constants from "../../common/constants.js";
import log from "./logging.js";

import type Event from "../../common/types/event";

defineEvent("webhookUpdate", async (channel) => {
	if (channel.guild.id !== config.guild.id) return;

	await log(`🌐 Webhooks updated in ${channel.toString()}!`, "channels");
});
