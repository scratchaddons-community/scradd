import { ButtonStyle, ComponentType, PermissionFlagsBits } from "discord.js";
import CONSTANTS from "../../common/CONSTANTS.js";
import log from "../../common/moderation/logging.js";
import { extractMessageExtremities, getBaseChannel, messageToText } from "../../util/discord.js";
import type Event from "../../common/types/event";

const event: Event<"messageDelete"> = async function event(message) {
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

	while (files.length > 9 + +!content) files.pop();

	await log(
		`🗑 ${message.partial ? "Unknown message" : "Message"}${
			message.author ? " by " + message.author.toString() : ""
		} in ${message.channel.toString()} deleted!`,
		"messages",
		{
			embeds,
			files: content
				? [{ attachment: Buffer.from(content, "utf-8"), name: "message.txt" }, ...files]
				: files,
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							label: "View Context",
							style: ButtonStyle.Link,
							type: ComponentType.Button,
							url: message.url,
						},
					],
				},
			],
		},
	);
};
export default event;
