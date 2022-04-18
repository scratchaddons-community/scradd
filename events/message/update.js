import { badWordsAllowed, censorMessage } from "../../common/mod.js";

/**
 * @file Enables Error reporting.
 *
 * @type {import("../../types/event").default<"messageUpdate">}
 */
const event = {
	async event(_, newMessage) {
		if (newMessage.partial) newMessage = await newMessage.fetch();
		if (!badWordsAllowed(newMessage.channel)) {
			if (await censorMessage(newMessage)) return;
		}
	},
};

export default event;
