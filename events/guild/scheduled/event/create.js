import { time } from "discord.js";
import log from "../../../../common/moderation/logging.js";

/** @type {import("../../../../types/event").default<"guildScheduledEventCreate">} */
const event = {
	async event(event) {
		const guild = event.guild || (await this.guilds.fetch(event.guildId));
		if (guild.id !== process.env.GUILD_ID) return;

		const start = event.scheduledStartAt,
			end = event.scheduledEndAt;

		await log(
			guild,
			`Event ${event.name} scheduled${
				start || end
					? ` for ${time(start || end || new Date())}${
							end && start ? "-" + time(end) : ""
					  }`
					: ""
			} in ${
				event.channel?.toString() ||
				event.entityMetadata?.location ||
				"an external location"
			}${event.creator ? " by " + event.creator.toString() : ""}${
				event.description ? ":\n" + event.description : "!"
			}`,
			"server",
		);
	},
};

export default event;
