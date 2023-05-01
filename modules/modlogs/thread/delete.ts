import CONSTANTS from "../../../common/CONSTANTS.js";
import log, { shouldLog } from "../logging.js";

import type Event from "../../../common/types/event";

defineEvent("threadDelete", async (thread) => {
	if (thread.guild.id !== CONSTANTS.guild.id) return;
	if (!shouldLog(thread)) return;

	await log(
		`🗑 Thread #${thread.name} ${
			thread.parent ? `in ${thread.parent.toString()} ` : ""
		}deleted! (ID: ${thread.id})`,
		"channels",
	);
});
