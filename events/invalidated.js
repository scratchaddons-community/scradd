import logError from "../util/logError.js";

/** @type {import("../common/types/event").default<"invalidated">} */
export default async function event() {
	await logError(new ReferenceError("Session is invalid"), "invalidated");
	process.exit(1);
}
