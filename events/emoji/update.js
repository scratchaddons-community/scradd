import { censor } from "../../common/mod.js";

/** @type {import("../../types/event").default<"emojiUpdate">} */
const event = {
	async event(_, newEmoji) {
		if (!newEmoji.name || newEmoji.guild.id !== process.env.GUILD_ID) return;
		const censored = censor(newEmoji.name);
		if (censored) await newEmoji.setName(censored.censored.replaceAll(/[^a-z0-9_]/g, "_"));
	},
};

export default event;
