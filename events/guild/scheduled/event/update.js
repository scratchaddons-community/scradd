import { time } from "discord.js";
import log from "../../../../common/moderation/logging.js";

/** @type {import("../../../../types/event").default<"guildScheduledEventUpdate">} */
const event = {
	async event(oldEvent, newEvent) {
		const guild = newEvent.guild || (await this.guilds.fetch(newEvent.guildId));
		if (guild.id !== process.env.GUILD_ID || !oldEvent) return;
		const logs = [];
		if (oldEvent.name !== newEvent.name) logs.push(" renamed to `" + newEvent.name + "`");

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

		if (oldEvent.image !== newEvent.image)
			logs.push(
				`’s image changed from <${oldEvent.coverImageURL()}> to <${newEvent.coverImageURL()}>`,
			); //TODO: it'll be 404

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

		await Promise.all(
			logs.map((edit) => log(guild, `Event ${oldEvent.name}${edit}!`, "server")),
		);
	},
};

export default event;
