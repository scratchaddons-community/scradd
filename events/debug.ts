import type Event from "../common/types/event";

const event: Event<"debug"> = function event(message) {
	if (
		(message.includes("Sending a heartbeat") || message.includes("Heartbeat acknowledged")) &&
		process.env.NODE_ENV === "production"
	)
		return;
	else console.debug(message);
};
export default event;
