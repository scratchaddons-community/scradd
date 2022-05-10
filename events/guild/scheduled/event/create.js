import log from "../../../../common/moderation/logging.js";

/** @type {import("../../../../types/event").default<"guildScheduledEventCreate">} */
const event = {
	async event(event) {
		if (!event.guild || event.guild.id !== process.env.GUILD_ID) return;

		const start = event.scheduledStartAt,
			end = event.scheduledEndAt;

		await log(
			event.guild,
			`Event ${event.name} scheduled${
				start || end ? ` for ${start || end}${end && start ? "-" + end : ""}` : ""
			} in ${
				event.channel?.toString() || event.entityMetadata.location || "an external location"
			}${event.creator ? " by " + event.creator.toString() : ""}${
				event.description ? ":\n" + event.description : "!"
			}`,
			"server",
		);
	},
};

export default event;

// Neither:
// Both: for ${start}-${end}

// Start: start || end?`for ${start || end}${end&&start?"-"+end:""}`:""
