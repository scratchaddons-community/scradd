import type Event from "../common/types/event";

const event: Event<"warn"> = function event(message) {
	process.emitWarning(message);
};
export default event;
