/** @file Update Potatoboard when reactions are cleared. */
import dotenv from "dotenv";

import { BOARD_EMOJI, sourceToBoardMessage, updateReactionCount } from "../common/board.js";

dotenv.config();

/**
 * Determine if a message should be removed from #potatoboard.
 *
 * @param {import("discord.js").Message | import("discord.js").PartialMessage} message - The message
 *   reactions were removed from.
 * @param {import("discord.js").Collection<string, import("discord.js").MessageReaction>} reactions
 *   - The removed reactions.
 */
export default async function reactionRemoveAll(message, reactions) {
	if (message.partial) message = await message.fetch();

	if (!reactions.get(BOARD_EMOJI) || message.guild?.id !== process.env.GUILD_ID) return;

	const boardMessage = await sourceToBoardMessage(message);

	if (!boardMessage) return;

	await updateReactionCount(0, boardMessage);
}
