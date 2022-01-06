import {BOARD_EMOJI, getMessageFromBoard, postMessageToBoard, MIN_COUNT, updateReactionCount} from "../common/board.js";

/**
 * @param {import("discord.js").MessageReaction} reaction
 * @param {import("discord.js").User} user
 */

export default async (reaction, user) => {
	if (reaction.partial) reaction=await reaction.fetch();
	if (reaction.message.partial) reaction.message=await reaction.message.fetch();
	if (user.partial)user= await user.fetch();
	const message = reaction.message;

	if (!message.author || !message.guild || reaction.emoji.name !== BOARD_EMOJI) return;

	if (
		// if a bot reacted
		user.bot ||
		// or if they self-reacted
		user.id === message.author.id ||
		// or if they reacted to a message on the board
		(message.channel.id === process.env.POTATOBOARD_CHANNEL_ID && message.author.id === message.client.user?.id)
	)
		// remove the reaction
		return reaction.users.remove(user);

	const boardMessage = await getMessageFromBoard(message)

	if (boardMessage?.embeds[0]) {
		updateReactionCount(reaction.count, boardMessage)
	} else {
		if(reaction.count<MIN_COUNT) return;
		postMessageToBoard(message)
	}
};
