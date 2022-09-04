/** @type {import("../../common/types/event").default<"guildUnavailable">} */
export default function event(guild) {
	throw new ReferenceError(`Guild ${guild.name} (${guild.id}) unavailable`);
}
