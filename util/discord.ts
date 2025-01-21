import type { Channel, SendableChannels } from "discord.js";

import { PermissionFlagsBits } from "discord.js";
import { client } from "strife.js";

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
