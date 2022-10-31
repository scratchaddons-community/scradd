import { time } from "discord.js";
import client from "../../../client.js";
import log from "../../../common/logging.js";
import difflib from "difflib";
import type Event from "../../../common/types/event";
import CONSTANTS from "../../../common/CONSTANTS.js";

const event: Event<"guildScheduledEventUpdate"> = async function event(oldEvent, newEvent) {
	const guild = newEvent.guild || (await client.guilds.fetch(newEvent.guildId));
	if (guild.id !== CONSTANTS.guild.id || !oldEvent) return;
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
		log(`📆 Event ${oldEvent.name}’s description was changed!`, "voice", {
			files: [
				{
					attachment: Buffer.from(
						difflib
							.unifiedDiff(
								(oldEvent.description || "").split("\n"),
								(newEvent.description || "").split("\n"),
							)
							.join("\n")
							.replace(/^--- \n{2}\+\+\+ \n{2}@@ .+ @@\n{2}/, ""),
						"utf-8",
					),
					name: "description.diff",
				},
			],
		});

	if (oldEvent.coverImageURL() !== newEvent.coverImageURL()) {
		const coverImageURL = newEvent.coverImageURL({ size: 128 });
		const response = coverImageURL && (await fetch(coverImageURL));
		await log(
			`📆 Event ${oldEvent.name}’s cover image was ${response ? `changed` : "removed"}!`,
			"voice",
			{ files: response ? [Buffer.from(await response.arrayBuffer())] : [] },
		);
	}

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

	await Promise.all(logs.map((edit) => log(`📆 Event ${oldEvent.name}${edit}!`, "voice")));
};
export default event;
