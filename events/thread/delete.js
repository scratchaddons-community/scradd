import { suggestionsDatabase } from "../../commands/get-top-suggestions.js";
import CONSTANTS from "../../common/CONSTANTS.js";
import log from "../../common/moderation/logging.js";
import { sendClosedMessage } from "../../common/modmail.js";

/** @type {import("../../common/types/event").default<"threadDelete">} */
export default async function event(thread) {
	if (thread.guild.id !== process.env.GUILD_ID) return;

	if (thread.parent?.id === CONSTANTS.channels.suggestions?.id) {
		suggestionsDatabase.data = suggestionsDatabase.data.filter(({ id }) => id !== thread.id);
	}

	log(
		`🗑 Thread #${thread.name} ${
			thread.parent ? `in ${thread.parent?.toString()} ` : ""
		}deleted! (ID: ${thread.id})`,
		"channels",
	);
	if (thread.parent?.id !== CONSTANTS.channels.modmail?.id || thread.archived) return;

	await sendClosedMessage(thread);
}
