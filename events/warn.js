import {emitWarning} from "process";

/**
 * @file Enables Reporting warnings.
 *
 * @type {import("../types/event").default<"warn">}
 */
const event = {
	event(message) {
		throw emitWarning(message);
	},
};

export default event;
