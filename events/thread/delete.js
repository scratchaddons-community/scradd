import log from "../../common/moderation/logging.js";
import { MODMAIL_CHANNEL, sendClosedMessage } from "../../common/modmail.js";

/** @type {import("../../types/event").default<"threadDelete">} */
const event = {
	async event(thread) {
		if (thread.guild.id !== process.env.GUILD_ID) return;
		log(
			thread.guild,
			`Thread #${thread.name} ${
				thread.parent ? `in ${thread.parent?.toString()} ` : ""
			}deleted! (ID ${thread.id})`,
			"channels",
		);
		if (thread.parent?.id !== MODMAIL_CHANNEL || thread.archived) return;

		await sendClosedMessage(thread);
	},
};

export default event;
