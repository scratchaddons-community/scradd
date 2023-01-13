import CONSTANTS from "../common/CONSTANTS.js";
import log from "../common/logging.js";

import type Event from "../common/types/event";

const event: Event<"applicationCommandPermissionsUpdate"> = async function event(permissions) {
	if (permissions.guildId !== CONSTANTS.guild.id) return;

	await log(`✏ Permissions for <@${permissions.applicationId}>’s commands edited!`, "server");
};
export default event;
