import log from "../../common/moderation/logging.js";

/** @type {import("../../types/event").default<"emojiUpdate">} */
const event = {
	async event(oldEmoji, newEmoji) {
		if (newEmoji.name === oldEmoji.name || newEmoji.guild.id !== process.env.GUILD_ID) return;
		await log(
			newEmoji.guild,
			`Emoji ${oldEmoji.toString()} renamed to :${newEmoji.name}:!`,
			"messages",
		);
	},
};

export default event;
