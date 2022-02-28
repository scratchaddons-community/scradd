import { MODMAIL_CHANNEL, sendClosedMessage, sendOpenedMessage } from "../common/modmail.js";

/** @type {import("../types/event").default<"threadUpdate">} */
const event = {
	async event(oldThread, newThread) {
		if (oldThread.parentId !== MODMAIL_CHANNEL || oldThread.archived === newThread.archived)
			return;
		if (newThread.archived) return sendClosedMessage(newThread);
		else
			return sendOpenedMessage(
				await newThread.guild.members.fetch(
					(
						await newThread.fetchStarterMessage()
					).embeds[0]?.description?.match(/<@(\d+)>/)?.[1] || "",
				),
			);
	},
};
export default event;
