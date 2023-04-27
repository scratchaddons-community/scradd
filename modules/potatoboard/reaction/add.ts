import client from "../../../client.js";
import updateBoard, { BOARD_EMOJI } from "../board.js";
import CONSTANTS from "../../../common/CONSTANTS.js";

import type Event from "../../../common/types/event";

const event: Event<"messageReactionAdd"> = async function event(partialReaction, partialUser) {
	const reaction = partialReaction.partial ? await partialReaction.fetch() : partialReaction;

	const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;

	if (!message.inGuild() || message.guild.id !== CONSTANTS.guild.id) return;

	const user = partialUser.partial ? await partialUser.fetch() : partialUser;

	const { emoji } = reaction;

	if (emoji.name === BOARD_EMOJI) {
		if (
			(user.id === message.author.id && process.env.NODE_ENV === "production") ||
			(message.channel.id === CONSTANTS.channels.board?.id &&
				message.author.id === client.user.id) ||
			["explore-potatoes", "explorepotatoes"].includes(message.interaction?.commandName || "")
		) {
			await reaction.users.remove(user);

			return;
		}

		await updateBoard(message);
	}
};
export default event;
