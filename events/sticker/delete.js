import log from "../../common/moderation/logging.js";

/** @type {import("../../types/event").default<"stickerDelete">} */
const event = {
	async event(sticker) {
		if (!sticker.guild || sticker.guild.id !== process.env.GUILD_ID) return;
		await log(sticker.guild, `🙁 Sticker ${sticker.name} deleted!`, "messages");
	},
};

export default event;
