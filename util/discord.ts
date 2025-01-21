import type {
	Channel,
	GuildTextBasedChannel,
	Message,
	SendableChannels,
	Snowflake,
} from "discord.js";

import { PermissionFlagsBits } from "discord.js";
import { client } from "strife.js";

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

export function assertSendable<T extends Channel>(channel: T): (T & SendableChannels) | undefined {
	if (!channel.isSendable()) return;
	if (channel.isDMBased()) return channel;

	if (channel.isThread()) {
		if (!channel.sendable) return;
		return channel;
	}

	const permissions = channel.permissionsFor(client.user);
	if (!permissions) return;

	if (permissions.has(PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages))
		return channel;
}
