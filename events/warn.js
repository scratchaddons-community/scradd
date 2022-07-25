/** @type {import("../types/event").default<"warn">} */
const event = {
	event(message) {
		process.emitWarning(message);
	},
};

export default event;
