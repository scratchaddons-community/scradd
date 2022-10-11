import log from "../../../common/moderation/logging.js";
import type Event from "../../../common/types/event";

const event: Event<"guildBanRemove"> = async function event(ban) {
	if (ban.guild.id !== process.env.GUILD_ID) return;
	await log(`↩️ User ${ban.user.toString()} unbanned!`, "members");
};
export default event;
