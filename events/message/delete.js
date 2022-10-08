import { AttachmentBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from "discord.js";
import CONSTANTS from "../../common/CONSTANTS.js";
import log from "../../common/moderation/logging.js";
import { extractMessageExtremities, getBaseChannel, messageToText } from "../../util/discord.js";
import { MessageActionRowBuilder } from "../../common/types/ActionRowBuilder.js";

/** @type {import("../../common/types/event").default<"messageDelete">} */
export default async function event(message) {
	if (
		message.channel.isDMBased() ||
		message.guild?.id !== process.env.GUILD_ID ||
		!message.channel
			.permissionsFor(CONSTANTS.roles.mod || message.guild.id)
			?.has(PermissionFlagsBits.ViewChannel)
	)
		return;

	const shush =
		message.partial || CONSTANTS.channels.modlogs?.id === getBaseChannel(message.channel)?.id;

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
