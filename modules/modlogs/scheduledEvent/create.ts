import { time } from "discord.js";

import client from "../../../client.js";
import CONSTANTS from "../../../common/CONSTANTS.js";
import log from "../../../modules/modlogs/logging.js";

import type Event from "../../../common/types/event";

defineEvent("guildScheduledEventCreate", async (event) => {
	const guild = event.guild ?? (await client.guilds.fetch(event.guildId));
	if (guild.id !== CONSTANTS.guild.id) return;

	const start = event.scheduledStartAt;
	const end = event.scheduledEndAt;

	await log(
		`🗓 Event ${event.name} scheduled${
			start ?? end
				? ` for ${time(start ?? end ?? new Date())}${end && start ? `-${time(end)}` : ""}`
				: ""
		} in ${
			event.channel?.toString() ?? event.entityMetadata?.location ?? "an external location"
		}${event.creator ? ` by ${event.creator.toString()}` : ""}${
			event.description ? `:\n${event.description}` : "!"
		}`,
		"voice",
	);
});
