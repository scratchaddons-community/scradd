import CONSTANTS from "../../common/CONSTANTS.js";
import log from "../../common/logging.js";
import type Event from "../../common/types/event";

const event: Event<"emojiDelete"> = async function event(emoji) {
	if (emoji.guild.id !== CONSTANTS.guild.id) return;
	await log(`🙁 Emoji ${emoji.toString()} deleted!`, "server");
};
export default event;
