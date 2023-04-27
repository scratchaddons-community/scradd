import CONSTANTS from "../common/CONSTANTS.js";

import type Event from "../common/types/event";

const event: Event<"threadCreate"> = async function event(thread, newlyCreated) {
	if (thread.guild.id !== CONSTANTS.guild.id || !newlyCreated) return;

	const toPing = [CONSTANTS.channels.mod?.id, CONSTANTS.channels.modlogs?.id].includes(
		thread.parent?.id,
	)
		? CONSTANTS.roles.mod?.toString()
		: thread.parent?.id === CONSTANTS.channels.exec?.id
		? "<@&1046043735680630784>"
		: thread.parent?.id === CONSTANTS.channels.admin?.id
		? CONSTANTS.roles.admin?.toString()
		: undefined;
	if (toPing) await thread.send({ content: toPing, allowedMentions: { parse: ["roles"] } });
};
export default event;
