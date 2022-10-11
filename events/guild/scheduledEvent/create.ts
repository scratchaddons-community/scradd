import { time } from "discord.js";
import client from "../../../client.js";
import log from "../../../common/moderation/logging.js";
import type Event from "../../../common/types/event";

const event: Event<"guildScheduledEventCreate"> = async function event(event) {
	const guild = event.guild || (await client.guilds.fetch(event.guildId));
	if (guild.id !== process.env.GUILD_ID) return;

	const start = event.scheduledStartAt,
		end = event.scheduledEndAt;

	await log(
		`🗓 Event ${event.name} scheduled${
			start || end
				? ` for ${time(start || end || new Date())}${end && start ? "-" + time(end) : ""}`
				: ""
		} in ${
			event.channel?.toString() || event.entityMetadata?.location || "an external location"
		}${event.creator ? " by " + event.creator.toString() : ""}${
			event.description ? ":\n" + event.description : "!"
		}`,
		"voice",
	);
};
export default event;
