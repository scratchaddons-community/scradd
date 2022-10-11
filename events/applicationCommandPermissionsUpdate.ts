import log from "../common/moderation/logging.js";
import type Event from "../common/types/event";

const event: Event<"applicationCommandPermissionsUpdate"> = async function event(permissions) {
	if (permissions.guildId !== process.env.GUILD_ID) return;

	await log(`✏ Permissions for <@${permissions.applicationId}>'s commands edited!`, "server");
};
export default event;
