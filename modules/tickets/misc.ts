import type { GuildMember, ThreadChannel, User } from "discord.js";
import CONSTANTS from "../../common/CONSTANTS.js";
import { asyncFilter } from "../../util/promises.js";

/**
 * Find a ticket for a user.
 *
 * @param user - The user to search for.
 *
 * @returns Ticket thread.
 */
export async function getThreadFromMember(user: GuildMember | User): Promise<ThreadChannel | void> {
	if (!CONSTANTS.channels.tickets) return;

	const { threads } = await CONSTANTS.channels.tickets.threads.fetchActive();

	return (
		await asyncFilter(
			threads.toJSON(),
			async (thread) => (await getUserFromTicket(thread))?.id === user.id && thread,
		).next()
	).value;
}

/**
 * Get the non-mod involved in a ticket.
 *
 * @param thread - Ticket thread.
 *
 * @returns User who messages are being sent to.
 */
export async function getUserFromTicket(thread: ThreadChannel): Promise<void | User> {
	const messages = await thread.messages.fetch({ after: thread.id, limit: 2 });
	return messages.first()?.mentions.users.first();
}

export const TICKET_CATEGORIES = [
	"appeal",
	"report",
	"role",
	"bug",
	"update",
	"rules",
	"server",
	"other",
] as const;
export type Category = typeof TICKET_CATEGORIES[number];
export const SA_CATEGORY = "sa";
