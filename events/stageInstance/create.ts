import client from "../../client.js";
import CONSTANTS from "../../common/CONSTANTS.js";
import log from "../../common/logging.js";

import type Event from "../../common/types/event";

const event: Event<"stageInstanceCreate"> = async function event(instance) {
	const guild = instance.guild || (await client.guilds.fetch(instance.guildId));

	if (guild.id !== CONSTANTS.guild.id) return;
	await log(
		`📸 Stage ${instance.channel?.toString()} went live${
			instance.guildScheduledEvent ? `for the ${instance.guildScheduledEvent.name} event` : ""
		} - ${instance.topic}`,
		"voice",
	);
};
export default event;
