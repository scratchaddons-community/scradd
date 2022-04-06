/**
 * @file Enables Reporting warnings.
 *
 * @type {import("../types/event").default<"warn">}
 */
const event = {
	event(message) {
		throw new Error(message);
	},
};

export default event;
