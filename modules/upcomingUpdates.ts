import { MessageType } from "discord.js";

import config from "../common/config.js";
import constants from "../common/constants.js";
import defineEvent from "../lib/events.js";
import { stripMarkdown } from "../util/markdown.js";
import { truncateText } from "../util/text.js";

defineEvent("messageCreate", async (message) => {
	if (
		!message.flags.has("Ephemeral") &&
		message.type !== MessageType.ThreadStarterMessage &&
		message.channel.id === config.channels.updates?.id
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
