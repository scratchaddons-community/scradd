import config from "../../../common/config.js";
import constants from "../../../common/constants.js";
import log from "../logging.js";

import type Event from "../../../common/types/event";

defineEvent("emojiUpdate", async (oldEmoji, newEmoji) => {
	if (newEmoji.name === oldEmoji.name || newEmoji.guild.id !== config.guild.id) return;
	await log(`😶 ${newEmoji.toString()} renamed to :${newEmoji.name}:!`, "server");
});
