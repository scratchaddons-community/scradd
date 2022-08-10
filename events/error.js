/** @type {import("../types/event").default<"error">} */
const event = {
	event(error) {
		throw error;
	},
};

export default event;
