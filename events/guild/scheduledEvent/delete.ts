import client from "../../../client.js";
import log from "../../../common/moderation/logging.js";
import type Event from "../../../common/types/event";

const event: Event<"guildScheduledEventDelete"> = async function event(event) {
	const guild = event.guild || (await client.guilds.fetch(event.guildId));
	if (guild.id !== process.env.GUILD_ID) return;

	await log(`📅 Event ${event.name} removed!`, "voice");
};
export default event;
