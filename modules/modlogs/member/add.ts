import CONSTANTS from "../../../common/CONSTANTS.js";
import log from "../../modlogs/logging.js";

import type Event from "../../../common/types/event";

defineEvent("guildMemberAdd", async (member) => {
	if (member.guild.id !== CONSTANTS.guild.id) return;
	await log(`👋 Member ${member.toString()} joined!`, "members");
});
