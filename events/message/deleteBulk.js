import { AttachmentBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import log from "../../common/moderation/logging.js";
import { getBaseChannel, messageToText } from "../../lib/discord.js";
import { MessageActionRowBuilder } from "../../common/types/ActionRowBuilder.js";
import CONSTANTS from "../../common/CONSTANTS.js";

/** @type {import("../../common/types/event").default<"messageDeleteBulk">} */
export default async function event(messages, channel) {
	if (
		!channel.guild ||
		channel.guild.id !== process.env.GUILD_ID ||
		CONSTANTS.channels.admin?.id === getBaseChannel(channel)?.id
	)
		return;
	const messagesInfo = (
		await Promise.all(
			messages.reverse().map(async (message) => {
				const content = !message.partial && (await messageToText(message));

				return `${message.author?.tag || "[unknown]"}${
					message.embeds.length || message.attachments.size ? " (" : ""
				}${message.embeds.length ? message.embeds.length + " embeds" : ""}${
					message.embeds.length && message.attachments.size ? ", " : ""
				}${message.attachments.size ? message.attachments.size + " attachments" : ""}${
					message.embeds.length || message.attachments.size ? ")" : ""
				}${content ? ":\n" + content : ""}`;
			}),
		)
	).join("\n\n---\n\n");

	log(`💥 ${messages.size} messages in ${channel.toString()} bulk deleted!`, "messages", {
		files: [
			new AttachmentBuilder(Buffer.from(messagesInfo, "utf-8"), { name: "messages.txt" }),
		],
		components: [
			new MessageActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setLabel("View Context")
					.setStyle(ButtonStyle.Link)
					.setURL(messages.first()?.url || ""),
			),
		],
	});
}
