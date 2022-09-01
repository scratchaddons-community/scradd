import CONSTANTS from "../../common/CONSTANTS.js";
import log from "../../common/moderation/logging.js";
import { sendClosedMessage } from "../../common/modmail.js";

/** @type {import("../../types/event").default<"threadDelete">} */
export default async function event(thread) {
	if (thread.guild.id !== process.env.GUILD_ID) return;
	log(
		`🗑 Thread #${thread.name} ${
			thread.parent ? `in ${thread.parent?.toString()} ` : ""
		}deleted! (ID ${thread.id})`,
		"channels",
	);
	if (thread.parent?.id !== CONSTANTS.channels.modmail?.id || thread.archived) return;

	await sendClosedMessage(thread);
}
