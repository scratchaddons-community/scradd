import { MessageActionRow, MessageAttachment, MessageButton } from "discord.js";
import log from "../../../common/moderation/logging.js";
import { extractMessageExtremities, messageToText } from "../../../lib/message.js";

/**
 * @file Enables Error reporting.
 *
 * @type {import("../../../types/event").default<"messageDeleteBulk">}
 */
const event = {
	async event(messages) {
		const last = messages.last();
		if (!last?.guild || process.env.GUILD_ID !== last.guild.id) return;
		if (last.guild.id !== process.env.GUILD_ID) return;
		const messagesInfo = (
			await Promise.all(
				messages.reverse().map(async (message) => {
					const content = await messageToText(message);

					return `${
						message.partial
							? ""
							: `${message.author.tag || "[unknown}"}${
									message.embeds.length && message.attachments.size ? " (" : ""
							  }${message.embeds.length ? message.embeds.length + " embeds" : ""}${
									message.embeds.length && message.attachments.size ? ", " : ""
							  }${
									message.attachments.size
										? message.attachments.size + " attachments"
										: ""
							  }${message.embeds.length && message.attachments.size ? ")" : ""}${
									content ? ":\n" + content : ""
							  }`
					}`;
				}),
			)
		).join("\n\n---\n\n");

		log(last.guild, `Bulk deleted ${messages.size} messages!`, "messages", {
			files: [new MessageAttachment(Buffer.from(messagesInfo, "utf-8"), "message.txt")],
			components: [
				new MessageActionRow().addComponents(
					new MessageButton()
						.setEmoji("👀")
						.setLabel("View Context")
						.setStyle("LINK")
						.setURL(last.url),
				),
			],
		});
	},
};

export default event;
