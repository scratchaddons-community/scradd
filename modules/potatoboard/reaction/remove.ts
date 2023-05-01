import updateBoard, { BOARD_EMOJI } from "../board.js";
import CONSTANTS from "../../../common/CONSTANTS.js";

import type Event from "../../../common/types/event";

const event: Event<"messageReactionRemove"> = async function event(partialReaction) {
	const reaction = partialReaction.partial ? await partialReaction.fetch() : partialReaction;

	const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;

	if (!message.inGuild() || message.guild.id !== CONSTANTS.guild.id) return;

	if (reaction.emoji.name === BOARD_EMOJI) await updateBoard(message);
};
export default event;
