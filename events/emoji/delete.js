import log from "../../common/moderation/logging.js";

/** @type {import("../../types/event").default<"emojiDelete">} */
export default async function event(emoji) {
	if (emoji.guild.id !== process.env.GUILD_ID) return;
	await log(`🙁 Emoji ${emoji.toString()} deleted!`, "messages");
}
