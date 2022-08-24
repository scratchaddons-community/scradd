import { ChannelType, ThreadAutoArchiveDuration } from "discord.js";
import { guild } from "../../client.js";

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
	const channel = await guild.channels.fetch(process.env.LOGS_CHANNEL || "");
	if (channel?.type !== ChannelType.GuildText)
		throw new TypeError("Channel isn’t a text channel");
	const threads = await channel.threads.fetchActive();
	return (
		threads.threads.find((/** @type {{ name: string }} */ thread) => thread.name === group) ||
		(await channel.threads.create({
			name: group,
			autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
		}))
	);
}
