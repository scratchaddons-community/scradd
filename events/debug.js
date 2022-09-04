/** @type {import("../common/types/event").default<"debug">} */
export default function event(message) {
	if (
		(message.includes("Sending a heartbeat") || message.includes("Heartbeat acknowledged")) &&
		process.env.NODE_ENV === "production"
	)
		return;
	else console.debug(message);
}
