import {
	BOARD_CHANNEL,
	BOARD_EMOJI,
	getMessageFromBoard,
	postMessageToBoard,
	MIN_REACTIONS,
	updateReactionCount,
} from "../common/board.js";
import dotenv from "dotenv";

dotenv.config();
/**
 * This code is reused for messageReactionRemove as well.
 *
 * @param {import("discord.js").MessageReaction} reaction
 * @param {import("discord.js").User} user
 */

export default async (reaction, user) => {
	if (reaction.partial) reaction = await reaction.fetch();
	if (reaction.message.partial) reaction.message = await reaction.message.fetch();
	if (user.partial) user = await user.fetch();
	const message = reaction.message;

	if (
		// Ignore other servers
		message.guild?.id !== process.env.GUILD_ID ||
		// Ignore when it's the wrong emoji
		reaction.emoji.name !== BOARD_EMOJI ||
		// Ignore when it's me
		user.id === message.client.user?.id
	)
		return;

	if (
		// if a bot reacted
		(user.bot && user.id !== message.client.user?.id) ||
		// or if they self-reacted
		(user.id === message.author.id && process.env.NODE_ENV === "production") ||
		// or if they reacted to a message on the board
		(message.channel.id === BOARD_CHANNEL && message.author.id === message.client.user?.id)
	)
		// remove the reaction
		return await reaction.users.remove(user);

	const boardMessage = await getMessageFromBoard(message);

	const fetched = message.reactions.resolve(BOARD_EMOJI);
	const count = (fetched?.count || 0) - (fetched?.me ? 1 : 0);

	if (boardMessage?.embeds[0]) {
		updateReactionCount(count, boardMessage);
	} else {
		if (count < MIN_REACTIONS) return;
		postMessageToBoard(message);
	}
};
