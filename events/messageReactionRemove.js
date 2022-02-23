/** @file Update Potatoboard when reactions are removed. */
import dotenv from "dotenv";

import {
	BOARD_EMOJI,
	sourceToBoardMessage,
	postMessageToBoard,
	MIN_REACTIONS,
	updateReactionCount,
} from "../common/board.js";

dotenv.config();

/**
 * Determine if a message should be posted to #potatoboard or update it if it is already there.
 *
 * This code is reused for messageReactionRemove as well.
 *
 * @param {import("discord.js").MessageReaction} reaction - The added reaction.
 * @param {import("discord.js").User} user - The user who reacted.
 */
export default async function reactionAdd(reaction, user) {
	if (reaction.partial) reaction = await reaction.fetch();

	const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;

	if (user.partial) user = await user.fetch();

	if (
		// Ignore other servers
		message.guild?.id !== process.env.GUILD_ID ||
		// Ignore when it's the wrong emoji
		reaction.emoji.name !== BOARD_EMOJI ||
		// Ignore when it's me
		user.id === message.client.user?.id
	)
		return;

	const boardMessage = await sourceToBoardMessage(message);

	const fetched = message.reactions.resolve(BOARD_EMOJI);
	const count = (fetched?.count || 0) - (fetched?.me ? 1 : 0);

	if (boardMessage?.embeds[0]) {
		await updateReactionCount(count, boardMessage);
	} else {
		if (count < MIN_REACTIONS) return;

		await postMessageToBoard(message);
	}
}
