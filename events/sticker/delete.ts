import log from "../../common/moderation/logging.js";
import type Event from "../../common/types/event";

const event: Event<"stickerDelete"> = async function event(sticker) {
	if (!sticker.guild || sticker.guild.id !== process.env.GUILD_ID) return;
	await log(`🙁 Sticker ${sticker.name} deleted!`, "server");
};
export default event;
