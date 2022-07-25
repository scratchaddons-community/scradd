import { BOARD_EMOJI, sourceToBoardMessage, updateReactionCount } from "../common/board.js";

/** @type {import("../types/event").default<"messageReactionRemoveEmoji">} */
const event = {
	async event(reaction) {
		if (reaction.partial) reaction = await reaction.fetch();

		const message = reaction.message.partial
			? await reaction.message.fetch()
			: reaction.message;

		if (reaction.emoji.toString() !== BOARD_EMOJI || message.guild?.id !== process.env.GUILD_ID)
			return;

		const boardMessage = await sourceToBoardMessage(message);

		if (!boardMessage) return;

		await updateReactionCount(0, boardMessage);
	},
};

export default event;
