import automodMessage from "../automod.js";

import type Event from "../../../common/types/event";

const event: Event<"messageUpdate"> = async function event(_, partialMessage) {
	const newMessage = partialMessage.partial ? await partialMessage.fetch() : partialMessage;

	await automodMessage(newMessage);
};

export default event;
