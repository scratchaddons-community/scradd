import log from "../../common/moderation/logging.js";

/** @type {import("../../common/types/event").default<"stickerCreate">} */
export default async function event(sticker) {
	if (sticker.partial) sticker = await sticker.fetch();
	if (!sticker.guild || sticker.guild.id !== process.env.GUILD_ID) return;
	await log(`🙂 Sticker ${sticker.name} created!`, "messages");
}
