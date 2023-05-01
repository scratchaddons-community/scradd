import CONSTANTS from "../../../common/CONSTANTS.js";
import log from "../logging.js";

import type Event from "../../../common/types/event";

defineEvent("stickerDelete", async (sticker) => {
	if (!sticker.guild || sticker.guild.id !== CONSTANTS.guild.id) return;
	await log(`🙁 Sticker ${sticker.name} deleted!`, "server");
});
