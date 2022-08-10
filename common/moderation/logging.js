import { ThreadAutoArchiveDuration } from "discord.js";

export const LOG_GROUPS = /** @type {const} */ ([
	"server",
	"messages",
	"channels",
	"members",
	"voice",
]);
/**
 * @param {import("discord.js").Guild} guild
 * @param {string} content
 * @param {typeof LOG_GROUPS[number]} group
 * @param {Pick<import("discord.js").MessageOptions, "embeds" | "files" | "components">} [extra]
 */
export default async function log(guild, content, group, extra = {}) {
	const thread = await getThread(group, guild);
	return await thread.send({ ...extra, content, allowedMentions: { users: [] } });
}

/**
 * @param {typeof LOG_GROUPS[number] | typeof import("../databases.js").DATABASE_THREAD} group
 * @param {import("discord.js").Guild} guild
 */
export async function getThread(group, guild) {
	const channel = await guild.channels.fetch(process.env.LOGS_CHANNEL || "");
	if (!channel?.isTextBased()) throw new TypeError("Channel is not a text channel");
	const threads = await channel.threads.fetchActive();
	return (
		threads.threads.find((/** @type {{ name: string }} */ thread) => thread.name === group) ||
		(await channel.threads.create({
			name: group,
			autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
		}))
	);
}
