import CONSTANTS from "../../common/CONSTANTS.js";
import log from "../../common/logging.js";
import type Event from "../../common/types/event";

const event: Event<"stickerCreate"> = async function event(sticker) {
	if (sticker.partial) sticker = await sticker.fetch();
	if (!sticker.guild || sticker.guild.id !== CONSTANTS.guild.id) return;
	await log(`🙂 Sticker ${sticker.name} created!`, "server");
};
export default event;
