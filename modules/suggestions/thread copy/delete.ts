import { suggestionsDatabase } from "../getTop.js";
import CONSTANTS from "../../../common/CONSTANTS.js";
import  { shouldLog } from "../../modlogs/logging.js";

import type Event from "../../../common/types/event";

const event: Event<"threadDelete"> = async function event(thread) {
	if (thread.guild.id !== CONSTANTS.guild.id) return;
	if (!shouldLog(thread)) return;

	if (thread.parent?.id === CONSTANTS.channels.suggestions?.id)
		suggestionsDatabase.data = suggestionsDatabase.data.filter(({ id }) => id !== thread.id);
};
export default event;
