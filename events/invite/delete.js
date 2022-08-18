import { Guild } from "discord.js";
import log from "../../common/moderation/logging.js";

/** @type {import("../../types/event").default<"inviteDelete">} */
export default async function event(invite) {
	if (!(invite.guild instanceof Guild) || invite.guild.id !== process.env.GUILD_ID) return;
	await log(
		`⛔ Invite ${invite.code} deleted` +
			(invite.uses === null ? "" : ` with ${invite.uses} uses`) +
			"!",
		"server",
	);
}
