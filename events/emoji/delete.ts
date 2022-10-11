import log from "../../common/moderation/logging.js";
import type Event from "../../common/types/event";

const event: Event<"emojiDelete"> = async function event(emoji) {
	if (emoji.guild.id !== process.env.GUILD_ID) return;
	await log(`🙁 Emoji ${emoji.toString()} deleted!`, "server");
};
export default event;
