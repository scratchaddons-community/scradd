import logError from "../util/logError.js";

import type Event from "../common/types/event";

export const event: Event<"invalidated"> = async function event() {
	await logError(new ReferenceError("Session is invalid"), "invalidated");
	process.exit(1);
};

export const eventTwo: Event<"guildUnavailable"> = function event(guild) {
	throw new ReferenceError(`Guild ${guild.name} (${guild.id}) unavailable`);
};
