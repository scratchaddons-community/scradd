/** @file Let A user know when their Modmail thread is archived or unarchived. */
import { MODMAIL_CHANNEL, sendClosedMessage, sendOpenedMessage } from "../common/modmail.js";

/** @type {import("../types/event").default<"threadUpdate">} */
const event = {
	async event(oldThread, newThread) {
		if (oldThread.parentId !== MODMAIL_CHANNEL || oldThread.archived === newThread.archived)
			return;

		if (newThread.archived) return await sendClosedMessage(newThread);

		return await sendOpenedMessage(
			await newThread.guild.members.fetch(
				/<@(?<userId>\d+)>/.exec(
					(await newThread.fetchStarterMessage()).embeds[0]?.description || "",
				)?.groups?.userId || "",
			),
		);
	},
};

export default event;
