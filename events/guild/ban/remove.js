import log from "../../../common/moderation/logging.js";

/** @type {import("../../../common/types/event").default<"guildBanRemove">} */
export default async function event(ban) {
	if (ban.guild.id !== process.env.GUILD_ID) return;
	await log(`↩️ User ${ban.user.toString()} unbanned!`, "members");
}
