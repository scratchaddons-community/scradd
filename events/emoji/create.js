import log from "../../common/moderation/logging.js";

/** @type {import("../../types/event").default<"emojiCreate">} */
export default async function event(emoji) {
	if (emoji.guild.id !== process.env.GUILD_ID) return;
	await log(
		`🙂 Emoji ${emoji.toString()} created${
			emoji.author ? " by " + emoji.author.toString() : ""
		}!`,
		"messages",
	);
}
