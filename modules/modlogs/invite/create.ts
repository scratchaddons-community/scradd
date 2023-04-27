import { Guild, time, TimestampStyles } from "discord.js";

import CONSTANTS from "../../../common/CONSTANTS.js";
import log from "../logging.js";

import type Event from "../../../common/types/event";

const event: Event<"inviteCreate"> = async function event(invite) {
	if (!(invite.guild instanceof Guild) || invite.guild.id !== CONSTANTS.guild.id) return;
	await log(
		`➕ ${invite.temporary ? "Temporary invite" : "Invite"} ${
			invite.code
		} for ${invite.channel?.toString()} created${
			invite.inviter ? ` by ${invite.inviter.toString()}` : ""
		}${
			invite.expiresAt || invite.maxUses
				? ` expiring ${
						invite.expiresAt ? time(invite.expiresAt, TimestampStyles.LongDate) : ""
				  }${invite.expiresAt && invite.maxUses ? " or " : ""}${
						invite.maxUses ? `after ${invite.maxUses} uses` : ""
				  }`
				: ""
		}!`,
		"members",
	);
};
export default event;
