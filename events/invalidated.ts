import logError from "../util/logError.js";
import type Event from "../common/types/event";

const event: Event<"invalidated"> = async function event() {
	await logError(new ReferenceError("Session is invalid"), "invalidated");
	process.exit(1);
};
export default event;
