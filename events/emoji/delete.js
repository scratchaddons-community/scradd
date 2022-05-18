import log from "../../common/moderation/logging.js";

/** @type {import("../../types/event").default<"emojiDelete">} */
const event = {
	async event(emoji) {
		if (emoji.guild.id !== process.env.GUILD_ID) return;
		await log(emoji.guild, `Emoji ${emoji.toString()} deleted!`, "messages");
	},
};

export default event;
