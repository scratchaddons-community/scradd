import log from "../../../common/moderation/logging.js";

/** @type {import("../../../types/event").default<"guildBanAdd">} */
export default async function event(ban) {
	if (ban.partial) ban = await ban.fetch();
	if (ban.guild.id !== process.env.GUILD_ID) return;
	await log(
		`🔨 User ${ban.user.toString()} banned${ban.reason ? ` - ${ban.reason}` : "!"}`,
		"members",
	);
}
