import { ThreadAutoArchiveDuration } from "discord.js";
import CONSTANTS from "../CONSTANTS.js";

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
 * @param {Pick<import("discord.js").MessageOptions, "embeds" | "files" | "components">} [extra]
 */
export default async function log(content, group, extra = {}) {
	const thread = await getThread(group);
	return await thread.send({ ...extra, content, allowedMentions: { users: [] } });
}

/** @param {typeof LOG_GROUPS[number] | typeof import("../database").DATABASE_THREAD} group */
export async function getThread(group) {
	if (!CONSTANTS.channels.modlogs) throw new ReferenceError("Cannot find logs channel");
	const threads = await CONSTANTS.channels.modlogs.threads.fetchActive();
	return (
		threads.threads.find((thread) => thread.name === group) ||
		(await CONSTANTS.channels.modlogs.threads.create({
			name: group,
			autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
		}))
	);
}
