/**
 * @file Enables Error reporting.
 *
 * @type {import("../types/event").default<"guildUnavailable">}
 */
const event = {
	event(guild) {
		throw new Error(`Guild ${guild.name} (${guild.id}) unavailable`);
	},
};

export default event;
