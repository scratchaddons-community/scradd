import client from "../../../../client.js";
import log from "../../../../common/moderation/logging.js";

/** @type {import("../../../../types/event").default<"guildScheduledEventDelete">} */
export default async function event(event) {
	const guild = event.guild || (await client.guilds.fetch(event.guildId));
	if (guild.id !== process.env.GUILD_ID) return;

	await log(`📅 Event ${event.name} removed!`, "server");
}
