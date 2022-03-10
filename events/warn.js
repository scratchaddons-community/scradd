/**
 * @file Enables Reporting warnings.
 *
 * @type {import("../types/event").default<"warn">}
 */
const event = {
	event(...args) {
		throw new Error(args.join(" "));
	},
};

export default event;
