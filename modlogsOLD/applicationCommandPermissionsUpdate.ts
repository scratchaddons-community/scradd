import config from "../../common/config.js";
import constants from "../../common/constants.js";
import log from "./logging.js";

import type Event from "../../common/types/event";

defineEvent("applicationCommandPermissionsUpdate", async (permissions) => {
	if (permissions.guildId !== config.guild.id) return;

	await log(`✏️ Permissions for <@${permissions.applicationId}>’s commands edited!`, "server");
});
