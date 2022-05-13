import { automodMessage } from "../../common/moderation/automod.js";

/**
 * @file Enables Error reporting.
 *
 * @type {import("../../types/event").default<"messageUpdate">}
 */
const event = {
	async event(_, newMessage) {
		if (newMessage.partial) newMessage = await newMessage.fetch();
		if (await automodMessage(newMessage)) return;
	},
};

export default event;
