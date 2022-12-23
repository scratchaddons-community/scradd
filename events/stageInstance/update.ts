import difflib from "difflib";

import client from "../../client.js";
import CONSTANTS from "../../common/CONSTANTS.js";
import log from "../../common/logging.js";

import type Event from "../../common/types/event";

const event: Event<"stageInstanceUpdate"> = async function event(oldInstance, newInstance) {
	const guild = newInstance.guild ?? (await client.guilds.fetch(newInstance.guildId));
	if (!oldInstance || guild.id !== CONSTANTS.guild.id) return;

	if (oldInstance.topic !== newInstance.topic) {
		await log(`✏ Stage ${newInstance.channel?.toString()}’s topic was changed!`, "voice", {
			files: [
				{
					attachment: Buffer.from(
						difflib
							.unifiedDiff(
								newInstance.topic.split("\n"),
								oldInstance.topic.split("\n"),
							)
							.join("\n")
							.replace(/^--- \n{2}\+\+\+ \n{2}@@ .+ @@\n{2}/, ""),
						"utf8",
					),

					name: "topic.diff",
				},
			],
		});
	}
};
export default event;
