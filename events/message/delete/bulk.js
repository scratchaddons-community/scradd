import { AttachmentBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import log from "../../../common/moderation/logging.js";
import { messageToText } from "../../../lib/message.js";
import {MessageActionRowBuilder} from "../../../types/ActionRowBuilder.js";

/** @type {import("../../../types/event").default<"messageDeleteBulk">} */
const event = {
	async event(messages, channel) {
		const last = messages.last();
		if (!last?.guild || last.guild.id !== process.env.GUILD_ID) return;
		const messagesInfo = (
			await Promise.all(
				messages.reverse().map(async (message) => {
					const content = !message.partial && (await messageToText(message));

					return `${message.author?.tag || "[unknown]"}${
						message.embeds.length && message.attachments.size ? " (" : ""
					}${message.embeds.length ? message.embeds.length + " embeds" : ""}${
						message.embeds.length && message.attachments.size ? ", " : ""
					}${message.attachments.size ? message.attachments.size + " attachments" : ""}${
						message.embeds.length && message.attachments.size ? ")" : ""
					}${content ? ":\n" + content : ""}`;
				}),
			)
		).join("\n\n---\n\n");

		log(
			last.guild,
			`${messages.size} messages in ${channel.toString()} bulk deleted!`,
			"messages",
			{
				files: [
					new AttachmentBuilder(Buffer.from(messagesInfo, "utf-8"), {
						name: "messages.txt",
					}),
				],
				components: [
					new MessageActionRowBuilder().addComponents(
						new ButtonBuilder()
							.setEmoji("👀")
							.setLabel("View Context")
							.setStyle(ButtonStyle.Link)
							.setURL(last.url),
					),
				],
			},
		);
	},
};

export default event;
