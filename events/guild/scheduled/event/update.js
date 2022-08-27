import { time } from "discord.js";
import client from "../../../../client.js";
import log from "../../../../common/moderation/logging.js";

/** @type {import("../../../../types/event").default<"guildScheduledEventUpdate">} */
export default async function event(oldEvent, newEvent) {
	const guild = newEvent.guild || (await client.guilds.fetch(newEvent.guildId));
	if (guild.id !== process.env.GUILD_ID || !oldEvent) return;
	const logs = [];
	if (oldEvent.name !== newEvent.name) logs.push("’s topic changed to `" + newEvent.name + "`");

	if (
		oldEvent.channel?.id !== newEvent.channel?.id ||
		oldEvent.entityMetadata?.location !== newEvent.entityMetadata?.location
	)
		logs.push(
			" moved to " +
				(oldEvent.channel?.toString() ||
					oldEvent.entityMetadata?.location ||
					"an external location"),
		);

	if (oldEvent.description !== newEvent.description)
		logs.push("’s description set to `" + newEvent.description + "`");

	if (oldEvent.coverImageURL() !== newEvent.coverImageURL())
		logs.push(
			`’s cover image changed from <${oldEvent.coverImageURL()}> to <${newEvent.coverImageURL()}>`,
		); //TODO: it’ll be 404

	if (
		oldEvent.scheduledStartAt?.valueOf() !== newEvent.scheduledStartAt?.valueOf() ||
		oldEvent.scheduledEndAt?.valueOf() !== newEvent.scheduledEndAt?.valueOf()
	) {
		const start = newEvent.scheduledStartAt,
			end = newEvent.scheduledEndAt;
		logs.push(
			` rescheduled${
				start || end
					? ` to ${time(start || end || new Date())}${
							end && start ? "-" + time(end) : ""
					  }`
					: ""
			}`,
		);
	}

	await Promise.all(logs.map((edit) => log(`📆 Event ${oldEvent.name}${edit}!`, "server")));
}
