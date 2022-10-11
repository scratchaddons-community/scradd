import log from "../common/moderation/logging.js";
import type Event from "../common/types/event";

const event: Event<"webhookUpdate"> = async function event(channel) {
	if (channel.guild.id !== process.env.GUILD_ID) return;

	await log(`🌐 Webhooks updated in ${channel.toString()}!`, "channels");
};
export default event;
