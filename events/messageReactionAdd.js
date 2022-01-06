const POTATO_BOARD = "928475852084240465";

/**
 * @param {import("discord.js").MessageReaction} reaction
 * @param {import("discord.js").User} user
 */

export default (reaction, user) => {
	if (reaction.emoji.name === "🥔") {
		reaction.message.guild?.channels.cache
			.get(POTATO_BOARD)
			?.send(`sombody reacted a potato wow!`);
	}
};
