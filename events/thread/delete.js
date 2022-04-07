/** @file Let A user know when their Modmail thread is deleted. */
import { MODMAIL_CHANNEL, sendClosedMessage } from "../../common/modmail.js";

/** @type {import("../../types/event").default<"threadDelete">} */
const event = {
	async event(thread) {
		if (thread.parent?.id !== MODMAIL_CHANNEL || thread.archived || thread.locked) return;

		await sendClosedMessage(thread);
	},
};

export default event;
