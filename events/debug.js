/**
 * @file Enables Debug output.
 *
 * @type {import("../types/event").default<"debug">}
 */
const event = { apply: process.env.NODE_ENV !== "production", event: console.debug };

export default event;
