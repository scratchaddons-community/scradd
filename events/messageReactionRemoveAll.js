import { Collection, Message, MessageReaction } from "discord.js";
import { BOARD_EMOJI, getMessageFromBoard, updateReactionCount } from "../common/board.js";

/**
 * @param {Message<boolean> | import("discord.js").PartialMessage} message
 * @param {Collection<string, MessageReaction>} reactions
 */
export default async function (message, reactions) {
	if (message.partial) message = await message.fetch();
	if (!reactions.get(BOARD_EMOJI)) return;
	const boardMessage = await getMessageFromBoard(message);
	if (!boardMessage) return;
	await updateReactionCount(0, boardMessage);
}
