import type { GuildTextBasedChannel, Message, Snowflake } from "discord.js";

/** @deprecated */
export async function getAllMessages(channel: GuildTextBasedChannel): Promise<Message<true>[]> {
	const messages = [];

	let lastId: Snowflake | undefined;

	do {
		const fetchedMessages = await channel.messages.fetch({ before: lastId, limit: 100 });

		messages.push(...fetchedMessages.values());
		lastId = fetchedMessages.lastKey();
	} while (lastId);

	return messages;
}
