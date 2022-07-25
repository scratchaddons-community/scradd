/** @type {import("../types/event").default<"guildUnavailable">} */
const event = {
	event(guild) {
		throw new ReferenceError(`Guild ${guild.name} (${guild.id}) unavailable`);
	},
};

export default event;
