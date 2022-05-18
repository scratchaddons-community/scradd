/** @file Update Potatoboard when reactions are removed. */

import {
	BOARD_EMOJI,
	sourceToBoardMessage,
	postMessageToBoard,
	MIN_REACTIONS,
	updateReactionCount,
} from "../../../common/board.js";

/** @type {import("../../../types/event").default<"messageReactionRemove">} */
const event = {
	async event(reaction, user) {
		const message = reaction.message.partial
			? await reaction.message.fetch()
			: reaction.message;

		if (
			// Ignore other servers
			message.guild?.id !== process.env.GUILD_ID ||
			// Ignore when it’s the wrong emoji
			reaction.emoji.name !== BOARD_EMOJI
		)
			return;

		if (user.partial) user = await user.fetch();

		const boardMessage = await sourceToBoardMessage(message);

		const fetched = message.reactions.resolve(BOARD_EMOJI);
		const count = fetched?.count ?? 0;

		if (boardMessage?.embeds[0]) {
			await updateReactionCount(count, boardMessage);
		} else {
			if (count < MIN_REACTIONS) return;

			await postMessageToBoard(message);
		}
	},
};

export default event;
