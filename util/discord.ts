import type { Channel, SendableChannels } from "discord.js";

import { PermissionFlagsBits } from "discord.js";
import { client } from "strife.js";

export function assertSendable<T extends Channel>(
	channel: T,
	additionalPermissions?: bigint,
): (T & SendableChannels) | undefined {
	if (!channel.isSendable()) return;
	if (channel.isDMBased()) return channel;

	if (channel.isThread()) {
		if (!channel.sendable) return;
		if (additionalPermissions !== undefined) {
			const permissions = channel.permissionsFor(client.user);
			if (!permissions?.has(additionalPermissions)) return;
		}
		return channel;
	}

	const permissions = channel.permissionsFor(client.user);
	if (!permissions) return;

	const needed = PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages;
	if (
		permissions.has(
			additionalPermissions === undefined ? needed : needed | additionalPermissions,
		)
	)
		return channel;
}
