import { MessageType } from "discord.js";

import CONSTANTS from "../common/CONSTANTS.js";
import defineEvent from "../events.js";
import { stripMarkdown } from "../util/markdown.js";
import { truncateText } from "../util/text.js";

defineEvent("messageCreate", async (message) => {
	if (
		!message.flags.has("Ephemeral") &&
		message.type !== MessageType.ThreadStarterMessage &&
		message.channel.id === CONSTANTS.channels.updates?.id
	) {
		await message.startThread({
			name: truncateText(
				stripMarkdown(message.cleanContent)?.split("\n")[0] || "New update!",
				50,
			),

			reason: "New upcoming update",
		});
	}
});
