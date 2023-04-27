import CONSTANTS from "../../../common/CONSTANTS.js";
import log from "../logging.js";

import type Event from "../../../common/types/event";

const event: Event<"roleCreate"> = async function event(role) {
	if (role.guild.id !== CONSTANTS.guild.id) return;
	await log(`🏷 Role ${role.toString()} created!`, "server");
};
export default event;
