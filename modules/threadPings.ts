import config from "../common/config.js";
import constants from "../common/constants.js";
import defineEvent from "../lib/events.js";

defineEvent("threadCreate", async (thread, newlyCreated) => {
	if (thread.guild.id !== config.guild.id || !newlyCreated) return;

	const toPing = [config.channels.mod?.id, config.channels.modlogs?.id].includes(
		thread.parent?.id,
	)
		? config.roles.mod?.toString()
		: thread.parent?.id === config.channels.exec?.id
		? "<@&1046043735680630784>"
		: thread.parent?.id === config.channels.admin?.id
		? config.roles.admin?.toString()
		: undefined;
	if (toPing) await thread.send({ content: toPing, allowedMentions: { parse: ["roles"] } });
});
