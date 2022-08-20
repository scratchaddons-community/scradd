import logError from "../lib/logError.js";

/** @type {import("../types/event").default<"invalidated">} */
export default async function event() {
	await logError(new ReferenceError("Session is invalid"), "invalidated");
	process.exit();
}
