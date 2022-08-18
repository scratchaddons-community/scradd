/** @type {import("../types/event").default<"warn">} */
export default function event(message) {
	process.emitWarning(message);
}
