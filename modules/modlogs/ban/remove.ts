import CONSTANTS from "../../../common/CONSTANTS.js";
import log from "../logging.js";

import type Event from "../../../common/types/event";

defineEvent("guildBanRemove", async (ban) => {
	if (ban.guild.id !== CONSTANTS.guild.id) return;
	await log(`↩️ User ${ban.user.toString()} unbanned!`, "members");
});
