import { Guild } from "discord.js";
import log from "../../common/moderation/logging.js";

/** @type {import("../../types/event").default<"inviteDelete">} */
const event = {
	async event(invite) {
		if (!(invite.guild instanceof Guild) || invite.guild.id !== process.env.GUILD_ID) return;
		await log(
			invite.guild,
			`Invite ${invite.code} deleted` +
				(invite.uses === null ? ` with ${invite.uses} uses` : "") +
				"!",
			"server",
		);
	},
};

export default event;
