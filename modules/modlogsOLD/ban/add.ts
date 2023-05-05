import CONSTANTS from "../../../common/CONSTANTS.js";
import log from "../logging.js";

import type Event from "../../../common/types/event";

defineEvent("guildBanAdd", async (partialBan) => {
	const ban = partialBan.partial ? await partialBan.fetch() : partialBan;
	if (ban.guild.id !== CONSTANTS.guild.id) return;
	await log(
		`🔨 User ${ban.user.toString()} banned${ban.reason ? ` - ${ban.reason}` : "!"}`,
		"members",
	);
});
