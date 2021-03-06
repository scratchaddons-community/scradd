import log from "../../common/moderation/logging.js";

/** @type {import("../../types/event").default<"stickerCreate">} */
const event = {
	async event(sticker) {
		if (sticker.partial) sticker = await sticker.fetch();
		if (!sticker.guild || sticker.guild.id !== process.env.GUILD_ID) return;
		await log(sticker.guild, `Sticker ${sticker.name} created!`, "messages");
	},
};

export default event;
