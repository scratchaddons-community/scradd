import { ChannelType, PermissionFlagsBits } from "discord.js";

import { getBaseChannel } from "../util/discord.js";
import CONSTANTS from "./CONSTANTS.js";

export const LOG_GROUPS = ["server", "messages", "channels", "members", "voice"] as const;

/**
 * Fetch a thread used for logging in #mod-logs.
 *
 * @param group - The thread to find.
 */
export async function getLoggingThread(
	group?: typeof LOG_GROUPS[number] | typeof import("./database").DATABASE_THREAD | undefined,
) {
	if (!CONSTANTS.channels.modlogs) throw new ReferenceError("Cannot find logs channel");
	if (!group) return CONSTANTS.channels.modlogs;

	const threads = await CONSTANTS.channels.modlogs.threads.fetchActive();

	return (
		threads.threads.find((thread) => thread.name === group) ||
		(await CONSTANTS.channels.modlogs.threads.create({
			name: group,
			reason: "New logging thread",
		}))
	);
}

/**
 * Log a message in #mod-logs.
 *
 * @param content - The message to log.
 * @param group - The thread to log it in.
 * @param extra - Extra extremities to log.
 */
export default async function log(
	content: string,
	group?: typeof LOG_GROUPS[number],
	extra: Pick<import("discord.js").BaseMessageOptions, "embeds" | "files" | "components"> = {},
) {
	const thread = await getLoggingThread(group);

	return await thread.send({ ...extra, content, allowedMentions: { users: [] } });
}

/**
 * Whether actions related to this channel should be logged in #mod-logs.
 *
 * @param channel - The channel to check.
 *
 * @returns Whether they should be logged.
 */
export function shouldLog(channel: import("discord.js").TextBasedChannel | null): boolean {
	const baseChannel = getBaseChannel(channel);

	return Boolean(
		baseChannel?.type !== ChannelType.DM &&
			baseChannel?.guild.id === CONSTANTS.guild.id &&
			baseChannel
				?.permissionsFor(CONSTANTS.roles.mod || baseChannel.guild.id)
				?.has(PermissionFlagsBits.ViewChannel),
	);
}
