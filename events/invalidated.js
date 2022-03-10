/**
 * @file Enables Error reporting.
 *
 * @type {import("../types/event").default<"invalidated">}
 */
const event = {
	event() {
		console.error("Session is invalid!");
		process.exit();
	},
};

export default event;
