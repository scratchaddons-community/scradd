import log from "../../../common/moderation/logging.js";

/** @type {import("../../../types/event").default<"guildBanRemove">} */
const event = {
	async event(ban) {
		if (ban.guild.id !== process.env.GUILD_ID) return;
		await log(ban.guild, `${ban.user.toString()} unbanned!`, "members");
	},
};

export default event;
