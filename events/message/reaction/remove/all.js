import {
	BOARD_EMOJI,
	sourceToBoardMessage,
	updateReactionCount,
} from "../../../../common/board.js";

/** @type {import("../../../../types/event").default<"messageReactionRemoveAll">} */
const event = {
	async event(message, reactions) {
		if (message.partial) message = await message.fetch();

		if (!reactions.get(BOARD_EMOJI) || message.guild?.id !== process.env.GUILD_ID) return;

		const boardMessage = await sourceToBoardMessage(message);

		if (!boardMessage) return;

		await updateReactionCount(0, boardMessage);
	},
};

export default event;
