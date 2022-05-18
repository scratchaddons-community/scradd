import log from "../../../../common/moderation/logging.js";

/** @type {import("../../../../types/event").default<"guildScheduledEventUpdate">} */
const event = {
	async event(oldEvent, newEvent) {
		const guild = newEvent.guild || (await newEvent.client.guilds.fetch(newEvent.guildId));
		if (guild.id !== process.env.GUILD_ID) return;
		const logs = [];
		if (oldEvent.name !== newEvent.name) logs.push(" renamed to `" + newEvent.name + "`");

		if (
			oldEvent.channel?.id !== newEvent.channel?.id ||
			oldEvent.entityMetadata?.location !== newEvent.entityMetadata?.location
		)
			logs.push(
				" moved to " +
					(oldEvent.channel?.toString() ||
						oldEvent.entityMetadata.location ||
						"an external location"),
			);

		if (oldEvent.description !== newEvent.description)
			logs.push("'s description set to `" + newEvent.description + "`"); // todo

		if (
			oldEvent.scheduledStartAt.valueOf() !== newEvent.scheduledStartAt.valueOf() ||
			oldEvent.scheduledEndAt?.valueOf() !== newEvent.scheduledEndAt?.valueOf()
		) {
			const start = newEvent.scheduledStartAt,
				end = newEvent.scheduledEndAt;
			logs.push(
				` rescheduled${
					start || end
						? ` to <t:${Math.round(+(start || end) / 1000)}>${
								end && start ? "-<t:" + Math.round(+end / 1000) + ">" : ""
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
