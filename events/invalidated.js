/**
 * @file Turns Off the bot when its session is invalidated.
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
