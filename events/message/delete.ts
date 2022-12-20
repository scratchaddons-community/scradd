import { ButtonStyle, ComponentType } from "discord.js";

import CONSTANTS from "../../common/CONSTANTS.js";
import { DATABASE_THREAD } from "../../common/database.js";
import log, { getLoggingThread, shouldLog } from "../../common/logging.js";
import { extractMessageExtremities, getBaseChannel, messageToText } from "../../util/discord.js";

import type Event from "../../common/types/event";

const databaseThread = await getLoggingThread(DATABASE_THREAD);

const event: Event<"messageDelete"> = async function event(message) {
	if (!shouldLog(message.channel)) return;

	const shush =
		message.partial ||
		(CONSTANTS.channels.modlogs?.id === getBaseChannel(message.channel)?.id &&
			databaseThread.id !== message.channel.id);

	const content = !shush && (await messageToText(message));
	const { embeds, files } = shush
		? { embeds: [], files: [] }
		: await extractMessageExtremities(message);

	while (files.length > 9 + Number(!content)) files.pop();

	await log(
		`🗑 ${message.partial ? "Unknown message" : "Message"}${
			message.author ? ` by ${message.author.toString()}` : ""
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
