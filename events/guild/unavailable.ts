import type Event from "../../common/types/event";

const event: Event<"guildUnavailable"> = function event(guild) {
	throw new ReferenceError(`Guild ${guild.name} (${guild.id}) unavailable`);
};
export default event;
