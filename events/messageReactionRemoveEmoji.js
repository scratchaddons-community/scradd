/** @file Update Potatoboard when an emoji is removed from reactions. */
import dotenv from "dotenv";

import { BOARD_EMOJI, sourceToBoardMessage, updateReactionCount } from "../common/board.js";

dotenv.config();

/** @param {import("discord.js").MessageReaction} reaction - The reactions that were removed. */
export default async function reactionRemove(reaction) {
	const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;

	if (reaction.emoji.toString() !== BOARD_EMOJI || message.guild?.id !== process.env.GUILD_ID)
		return;

	const boardMessage = await sourceToBoardMessage(message);

	if (!boardMessage) return;

	await updateReactionCount(0, boardMessage);
}
