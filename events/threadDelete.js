import { MODMAIL_CHANNEL, sendClosedMessage } from "../common/modmail.js";

/** @type {import("../types/event").default<"threadDelete">} */
const event = {
	async event(thread) {
		if (
			thread.guild.id !== process.env.GUILD_ID ||
			thread.parent?.id !== MODMAIL_CHANNEL ||
			thread.archived
		)
			return;

		await sendClosedMessage(thread);
	},
};

export default event;
