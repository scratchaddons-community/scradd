import logError from "../lib/logError.js";

/**
 * @file Turns Off the bot when its session is invalidated.
 *
 * @type {import("../types/event").default<"invalidated">}
 */
const event = {
	async event() {
		await logError(new ReferenceError("Session is invalid!"), "invalidated", this);
		process.exit();
	},
};

export default event;
