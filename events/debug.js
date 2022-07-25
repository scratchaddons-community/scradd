/** @type {import("../types/event").default<"debug">} */
const event = {
	event(message) {
		if (
			(message.includes("Sending a heartbeat") ||
				message.includes("Heartbeat acknowledged")) &&
			process.env.NODE_ENV === "production"
		)
			return;
		else console.debug(message);
	},
};
export default event;
