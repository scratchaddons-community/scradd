import { Guild, time } from "discord.js";
import log from "../../common/moderation/logging.js";

/** @type {import("../../types/event").default<"inviteCreate">} */
export default async function event(invite) {
	if (!(invite.guild instanceof Guild) || invite.guild.id !== process.env.GUILD_ID) return;
	await log(
		`➕ ${invite.temporary ? "Temporary invite" : "Invite"} ${
			invite.code
		} for ${invite.channel?.toString()} created${
			invite.inviter ? ` by ${invite.inviter.toString()}` : ""
		}${
			invite.expiresAt || invite.maxUses
				? ` expiring ${invite.expiresAt ? time(invite.expiresAt) : ""}${
						invite.expiresAt && invite.maxUses ? " or " : ""
				  }${invite.maxUses ? "after " + invite.maxUses + " uses" : ""}`
				: ""
		}!`,
		"server",
	);
}
