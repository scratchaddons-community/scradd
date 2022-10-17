import { Guild } from "discord.js";
import CONSTANTS from "../../common/CONSTANTS.js";
import log from "../../common/moderation/logging.js";
import type Event from "../../common/types/event";

const event: Event<"inviteDelete"> = async function event(invite) {
	if (!(invite.guild instanceof Guild) || invite.guild.id !== CONSTANTS.guild.id) return;
	await log(
		`⛔ Invite ${invite.code} deleted` +
			(invite.uses === null ? "" : ` with ${invite.uses} uses`) +
			"!",
		"members",
	);
};
export default event;
