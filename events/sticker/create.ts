import log from "../../common/moderation/logging.js";
import type Event from "../../common/types/event";

const event: Event<"stickerCreate"> = async function event(sticker) {
	if (sticker.partial) sticker = await sticker.fetch();
	if (!sticker.guild || sticker.guild.id !== process.env.GUILD_ID) return;
	await log(`🙂 Sticker ${sticker.name} created!`, "server");
};
export default event;
