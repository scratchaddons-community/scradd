import CONSTANTS from "../../common/CONSTANTS.js";
import log from "../../common/moderation/logging.js";
import type Event from "../../common/types/event";

const event: Event<"stickerDelete"> = async function event(sticker) {
	if (!sticker.guild || sticker.guild.id !== CONSTANTS.guild.id) return;
	await log(`🙁 Sticker ${sticker.name} deleted!`, "server");
};
export default event;
