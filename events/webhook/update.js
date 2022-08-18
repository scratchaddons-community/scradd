import log from "../../common/moderation/logging.js";

/** @type {import("../../types/event").default<"webhookUpdate">} */
export default async function event(channel) {
	if (channel.guild.id !== process.env.GUILD_ID) return;

	await log(`🌐 Webhooks updated in ${channel.toString()}!`, "voice");
}
