import { Guild } from "discord.js";
import log from "../../common/moderation/logging.js";
import type Event from "../../common/types/event";

const event: Event<"inviteDelete"> = async function event(invite) {
	if (!(invite.guild instanceof Guild) || invite.guild.id !== process.env.GUILD_ID) return;
	await log(
		`⛔ Invite ${invite.code} deleted` +
			(invite.uses === null ? "" : ` with ${invite.uses} uses`) +
			"!",
		"members",
	);
};
export default event;
