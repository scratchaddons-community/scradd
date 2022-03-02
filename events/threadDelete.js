/** @file Let A user know when their Modmail thread is deleted. */
import { MODMAIL_CHANNEL, sendClosedMessage } from "../common/modmail.js";

/** @type {import("../types/event").default<"threadDelete">} */
const event = {
	async event(thread) {
		if (thread.parentId !== MODMAIL_CHANNEL || thread.archived || thread.locked) return;

		return await sendClosedMessage(thread);
	},
};

export default event;
