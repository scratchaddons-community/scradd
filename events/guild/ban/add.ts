import CONSTANTS from "../../../common/CONSTANTS.js";
import log from "../../../common/logging.js";

import type Event from "../../../common/types/event";

const event: Event<"guildBanAdd"> = async function event(partialBan) {
	const ban = partialBan.partial ? await partialBan.fetch() : partialBan;
	if (ban.guild.id !== CONSTANTS.guild.id) return;
	await log(
		`🔨 User ${ban.user.toString()} banned${ban.reason ? ` - ${ban.reason}` : "!"}`,
		"members",
	);
};
export default event;
