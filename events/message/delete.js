import { AttachmentBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import log from "../../common/moderation/logging.js";
import { extractMessageExtremities, messageToText } from "../../lib/message.js";
import { MessageActionRowBuilder } from "../../types/ActionRowBuilder.js";

/** @type {import("../../types/event").default<"messageDelete">} */
export default async function event(message) {
	if (!message.guild || message.guild.id !== process.env.GUILD_ID) return;
	const shush =
		message.partial ||
		(message.channel.isThread() && message.channel.parent?.id === process.env.LOGS_CHANNEL);

	const content = !shush && (await messageToText(message));
	const { embeds, files } = shush
		? { embeds: [], files: [] }
		: await extractMessageExtremities(message);
	if (content)
		files.unshift(
			new AttachmentBuilder(Buffer.from(content, "utf-8"), { name: "message.txt" }),
		);

	while (files.length > 10) files.pop();

	await log(
		`🗑 ${message.partial ? "Unknown message" : "Message"}${
			message.author ? " by " + message.author.toString() : ""
		} in ${message.channel.toString()} deleted!`,
		"messages",
		{
			embeds,
			files,
			components: [
				new MessageActionRowBuilder().addComponents(
					new ButtonBuilder()
						.setLabel("View Context")
						.setStyle(ButtonStyle.Link)
						.setURL(message.url),
				),
			],
		},
	);
}
