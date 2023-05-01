import { MessageType } from "discord.js";

import CONSTANTS from "../../common/CONSTANTS.js";
import { stripMarkdown } from "../../util/markdown.js";
import { truncateText } from "../../util/text.js";

import type Event from "../../common/types/event";

const event: Event<"messageCreate"> = async function event(message) {
	if (message.flags.has("Ephemeral") || message.type === MessageType.ThreadStarterMessage) return;

	if (message.channel.isDMBased() || message.guild?.id !== CONSTANTS.guild.id) return;

	if (message.channel.id === CONSTANTS.channels.updates?.id) {
		await message.startThread({
			name: truncateText(
				stripMarkdown(message.cleanContent)?.split("\n")[0] || "New update!",
				50,
			),

			reason: "New upcoming update",
		});
	}
};
export default event;
