import log from "../../common/moderation/logging.js";

/** @type {import("../../types/event").default<"stickerDelete">} */
export default async function event(sticker) {
	if (!sticker.guild || sticker.guild.id !== process.env.GUILD_ID) return;
	await log(`🙁 Sticker ${sticker.name} deleted!`, "messages");
}
