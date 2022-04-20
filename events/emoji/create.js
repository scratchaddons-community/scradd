import { warn } from "../../common/moderation/warns.js";
import { censor } from "../../common/moderation/automod.js";

/** @type {import("../../types/event").default<"emojiCreate">} */
const event = {
	async event(emoji) {
		if (!emoji.name || emoji.guild.id !== process.env.GUILD_ID) return;
		const censored = censor(emoji.name);
		if (censored) {
			await emoji.setName(censored.censored.replaceAll(/[^a-z0-9_]/g, "_"));
			if (emoji.author) await warn(emoji.author, "Watch your language!", censored.strikes);
		}
	},
};

export default event;
