import { censorMessage } from "../../common/moderation.js";

/**
 * @file Enables Error reporting.
 *
 * @type {import("../../types/event").default<"messageUpdate">}
 */
const event = {
	async event(_, newMessage) {
		if (newMessage.partial) newMessage = await newMessage.fetch();
		if (await censorMessage(newMessage)) return;
	},
};

export default event;
