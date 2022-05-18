import log from "../../../../common/moderation/logging.js";

/** @type {import("../../../../types/event").default<"guildScheduledEventCreate">} */
const event = {
	async event(event) {
		const guild = event.guild || (await event.client.guilds.fetch(event.guildId));
		if (guild.id !== process.env.GUILD_ID) return;

		const start = event.scheduledStartAt,
			end = event.scheduledEndAt;

		await log(
			guild,
			`Event ${event.name} scheduled${
				start || end
					? ` for <t:${Math.round(+(start || end) / 1000)}>${
							end && start ? "-<t:" + Math.round(+end / 1000) + ">" : ""
					  }`
					: ""
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
