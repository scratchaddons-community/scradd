import log from "../../common/moderation/logging.js";

/** @type {import("../../types/event").default<"emojiUpdate">} */
export default async function event(oldEmoji, newEmoji) {
	if (newEmoji.name === oldEmoji.name || newEmoji.guild.id !== process.env.GUILD_ID) return;
	await log(`😶 Emoji ${oldEmoji.toString()} renamed to :${newEmoji.name}:!`, "messages");
}
