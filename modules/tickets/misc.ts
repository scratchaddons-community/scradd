import type { GuildMember, PartialGuildMember, PartialUser, ThreadChannel, User } from "discord.js";
import config from "../../common/config.js";

/**
 * Find a ticket for a user.
 *
 * @param user - The user to search for.
 *
 * @returns Ticket thread.
 */
export async function getThreadFromMember(
	user: GuildMember | User | PartialGuildMember | PartialUser,
): Promise<ThreadChannel | void> {
	if (!config.channels.tickets) return;

	const { threads } = await config.channels.tickets.threads.fetchActive();

	return threads.find((thread) => thread.name.match(/\(d+\)$/)?.[1] === user.id);
}

export const TICKET_CATEGORIES = [
	"appeal",
	"report",
	"role",
	"bug",
	"rules",
	"server",
	"other",
] as const;
export type Category = typeof TICKET_CATEGORIES[number];
export const SA_CATEGORY = "sa";
export const SERVER_CATEGORY = "update";
