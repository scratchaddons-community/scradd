import warn from "../../common/moderation/warns.js";
import { censor } from "../../common/moderation/automod.js";
import log from "../../common/moderation/logging.js";

/** @type {import("../../types/event").default<"stickerDelete">} */
const event = {
	async event(sticker) {
		if (!sticker.guild || sticker.guild.id !== process.env.GUILD_ID) return;
		await log(sticker.guild, `Sticker ${sticker.toString()} deleted!`, "messages");
	},
};

export default event;
