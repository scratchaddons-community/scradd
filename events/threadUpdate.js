import { MODMAIL_CHANNEL, sendClosedMessage, sendOpenedMessage } from "../common/modmail.js";

/**
 * @param {import("discord.js").ThreadChannel} oldThread - The thread before the update.
 * @param {import("discord.js").ThreadChannel} newThread - The thread after the update.
 */
export default async function threadUpdate(oldThread, newThread) {
	if (oldThread.parentId !== MODMAIL_CHANNEL || oldThread.archived === newThread.archived) return;
	if (newThread.archived) return sendClosedMessage(newThread);
	else
		return sendOpenedMessage(
			await newThread.guild.members.fetch(
				(
					await newThread.fetchStarterMessage()
				).embeds[0]?.description?.match(/<@(\d+)>/)?.[1] || "",
			),
		);
}
