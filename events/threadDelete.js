import { MODMAIL_CHANNEL, sendClosedMessage } from "../common/modmail.js";

/** @param {import("discord.js").ThreadChannel} thread - The thread that was deleted. */
export default async function threadDelete(thread) {
	if (thread.parentId !== MODMAIL_CHANNEL || thread.archived || thread.locked) return;
	return sendClosedMessage(thread);
}
