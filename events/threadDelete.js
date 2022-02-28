import { MODMAIL_CHANNEL, sendClosedMessage } from "../common/modmail.js";

/** @type {import("../types/event").default<"threadDelete">} */
const event = {
	async event(thread) {
		if (thread.parentId !== MODMAIL_CHANNEL || thread.archived || thread.locked) return;
		return sendClosedMessage(thread);
	},
};
export default event;
