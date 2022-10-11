import log from "../../../common/moderation/logging.js";
import type Event from "../../../common/types/event";

const event: Event<"guildBanAdd"> = async function event(ban) {
	if (ban.partial) ban = await ban.fetch();
	if (ban.guild.id !== process.env.GUILD_ID) return;
	await log(
		`🔨 User ${ban.user.toString()} banned${ban.reason ? ` - ${ban.reason}` : "!"}`,
		"members",
	);
};
export default event;
