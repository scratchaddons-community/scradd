import { ChannelType, PermissionFlagsBits } from "discord.js";

import { getBaseChannel } from "../util/discord.js";
import CONSTANTS from "./CONSTANTS.js";

export const LOG_GROUPS = /** @type {const} */ ([
	"server",
	"messages",
	"channels",
	"members",
	"voice",
]);
/**
 * @param {string} content
 * @param {typeof LOG_GROUPS[number]} group
 * @param {Pick<import("discord.js").BaseMessageOptions, "embeds" | "files" | "components">} [extra]
 */
export default async function log(content, group, extra = {}) {
	const thread = await getLoggingThread(group);

	return await thread.send({ ...extra, content, allowedMentions: { users: [] } });
}

/** @param {typeof LOG_GROUPS[number] | typeof import("./database").DATABASE_THREAD} group */
export async function getLoggingThread(group) {
	if (!CONSTANTS.channels.modlogs) throw new ReferenceError("Cannot find logs channel");

	const threads = await CONSTANTS.channels.modlogs.threads.fetchActive();

	return (
		threads.threads.find((thread) => thread.name === group) ||
		(await CONSTANTS.channels.modlogs.threads.create({
			name: group,
			reason: "New logging thread",
		}))
	);
}

/** @param {import("discord.js").TextBasedChannel | null} channel */
export function shouldLog(channel) {
	const baseChannel = getBaseChannel(channel);

	return (
		baseChannel?.type !== ChannelType.DM &&
		baseChannel?.guild.id === CONSTANTS.guild.id &&
		baseChannel
			?.permissionsFor(CONSTANTS.roles.mod || baseChannel.guild.id)
			?.has(PermissionFlagsBits.ViewChannel)
	);
}
