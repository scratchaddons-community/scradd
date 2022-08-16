import log from "../../common/moderation/logging.js";

/** @type {import("../../types/event").default<"emojiCreate">} */
const event = {
	async event(emoji) {
		if (emoji.guild.id !== process.env.GUILD_ID) return;
		await log(
			emoji.guild,
			`🙂 Emoji ${emoji.toString()} created${
				emoji.author ? " by " + emoji.author.toString() : ""
			}!`,
			"messages",
		);
	},
};

export default event;
