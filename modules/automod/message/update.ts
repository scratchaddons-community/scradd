import automodMessage from "../automod.js";

import type Event from "../../../common/types/event";

defineEvent("messageUpdate", async (_, partialMessage) => {
	const newMessage = partialMessage.partial ? await partialMessage.fetch() : partialMessage;

	await automodMessage(newMessage);
});
