import CONSTANTS from "../../../common/CONSTANTS.js";
import log from "../logging.js";

import type Event from "../../../common/types/event";

const event: Event<"emojiCreate"> = async function event(emoji) {
	if (emoji.guild.id !== CONSTANTS.guild.id) return;
	await log(
		`🙂 Emoji ${emoji.toString()} created${
			emoji.author ? ` by ${emoji.author.toString()}` : ""
		}!`,
		"server",
	);
};
export default event;
