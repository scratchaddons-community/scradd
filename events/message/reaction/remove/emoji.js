import {
	BOARD_EMOJI,
	sourceToBoardMessage,
	updateReactionCount,
} from "../../../../common/board.js";

/** @type {import("../../../../types/event").default<"messageReactionRemoveEmoji">} */
export default async function event(reaction) {
	const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;

	if (reaction.emoji.toString() !== BOARD_EMOJI || message.guild?.id !== process.env.GUILD_ID)
		return;

	const boardMessage = await sourceToBoardMessage(message);

	if (!boardMessage) return;

	await updateReactionCount(0, boardMessage);
}
