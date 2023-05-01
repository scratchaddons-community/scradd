import CONSTANTS from "../../common/CONSTANTS.js";
import log from "./logging.js";

import type Event from "../../common/types/event";

defineEvent("applicationCommandPermissionsUpdate", async (permissions) => {
	if (permissions.guildId !== CONSTANTS.guild.id) return;

	await log(`✏️ Permissions for <@${permissions.applicationId}>’s commands edited!`, "server");
});
