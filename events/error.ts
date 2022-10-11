import type Event from "../common/types/event";

const event: Event<"error"> = function event(error) {
	throw error;
};
export default event;
