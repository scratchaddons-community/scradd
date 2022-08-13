import logError from "../lib/logError.js";

/** @type {import("../types/event").default<"invalidated">} */
const event = {
	async event() {
		await logError(new ReferenceError("Session is invalid"), "invalidated", this);
		process.exit();
	},
};

export default event;
