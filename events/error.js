/**
 * @file Enables Error reporting.
 *
 * @type {import("../types/event").default<"error">}
 */
const event = {
	event(...args) {
		throw new Error(args.join(" "));
	},
};

export default event;
