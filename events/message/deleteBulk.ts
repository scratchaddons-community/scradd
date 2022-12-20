import { ButtonStyle, ComponentType } from "discord.js";

import log, { shouldLog } from "../../common/logging.js";
import { messageToText } from "../../util/discord.js";

import type Event from "../../common/types/event";

const event: Event<"messageDeleteBulk"> = async function event(messages, channel) {
	if (!shouldLog(channel)) return;
	const messagesInfo = (
		await Promise.all(
			messages.reverse().map(async (message) => {
				const content = !message.partial && (await messageToText(message));

				return `${message.author?.tag || "[unknown]"}${
					message.embeds.length > 0 || message.attachments.size > 0 ? " (" : ""
				}${message.embeds.length > 0 ? `${message.embeds.length} embeds` : ""}${
					message.embeds.length > 0 && message.attachments.size > 0 ? ", " : ""
				}${message.attachments.size > 0 ? `${message.attachments.size} attachments` : ""}${
					message.embeds.length > 0 || message.attachments.size > 0 ? ")" : ""
				}${content ? `:\n${content}` : ""}`;
			}),
		)
	).join("\n\n---\n\n");

	log(`💥 ${messages.size} messages in ${channel.toString()} bulk deleted!`, "messages", {
		files: [{ attachment: Buffer.from(messagesInfo, "utf-8"), name: "messages.txt" }],

		components: [
			{
				type: ComponentType.ActionRow,

				components: [
					{
						label: "View Context",
						style: ButtonStyle.Link,
						type: ComponentType.Button,
						url: messages.first()?.url ?? "",
					},
				],
			},
		],
	});
};
export default event;
