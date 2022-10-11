import log from "../../common/moderation/logging.js";
import type Event from "../../common/types/event";

const event: Event<"emojiUpdate"> = async function event(oldEmoji, newEmoji) {
	if (newEmoji.name === oldEmoji.name || newEmoji.guild.id !== process.env.GUILD_ID) return;
	await log(`😶 Emoji ${oldEmoji.toString()} renamed to :${newEmoji.name}:!`, "server");
};
export default event;
