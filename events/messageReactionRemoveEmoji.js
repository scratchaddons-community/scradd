import { MessageReaction } from "discord.js";
import { BOARD_EMOJI, getMessageFromBoard, updateReactionCount } from "../common/board.js";

/**
 * @param {MessageReaction} reaction
 */
export default async function (reaction) {
	const message =reaction.message.partial? await reaction.message.fetch():reaction.message;
	if (reaction.emoji.toString()!==BOARD_EMOJI) return;
	const boardMessage = await getMessageFromBoard(message);
	if (!boardMessage) return;
	await updateReactionCount(0, boardMessage);
}
