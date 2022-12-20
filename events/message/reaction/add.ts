import client from "../../../client.js";
import { suggestionsDatabase } from "../../../commands/get-top-suggestions.js";
import { censor, badWordsAllowed } from "../../../common/automod.js";
import { BOARD_EMOJI, updateBoard } from "../../../common/board.js";
import CONSTANTS from "../../../common/CONSTANTS.js";
import warn from "../../../common/punishments.js";

import type Event from "../../../common/types/event";

const event: Event<"messageReactionAdd"> = async function event(reaction, user) {
	if (reaction.partial) reaction = await reaction.fetch();

	const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;

	// Ignore other servers
	if (!message.inGuild() || message.guild.id !== CONSTANTS.guild.id) return;

	if (user.partial) user = await user.fetch();

	const { emoji } = reaction;

	if (emoji.name && !badWordsAllowed(message.channel)) {
		const censored = censor(emoji.name);
		if (censored) {
			await warn(
				user,
				"Watch your language!",
				censored.strikes,
				`Reacted with:\n:${emoji.name}:`,
			);
			await reaction.remove();
			return;
		}
	}

	if (
		message.channel.parent?.id === CONSTANTS.channels.suggestions?.id &&
		message.channel.isThread() &&
		(await message.channel.fetchStarterMessage())?.id === message.id
	) {
		const defaultEmoji = CONSTANTS.channels.suggestions?.defaultReactionEmoji;
		if (defaultEmoji?.id === emoji.id || defaultEmoji?.name === emoji.name) {
			suggestionsDatabase.data = suggestionsDatabase.data.map((suggestion) =>
				suggestion.id === message.id
					? { ...suggestion, count: reaction.count || 0 }
					: suggestion,
			);
		} else {
			await message.reactions.resolve(reaction).users.remove(user);
		}
	}

	// Ignore when it’s the wrong emoji
	if (emoji.name === BOARD_EMOJI) {
		if (
			// If they self-reacted
			(user.id === message.author.id && process.env.NODE_ENV === "production") ||
			// Or if they reacted to a message on the board
			(message.channel.id === CONSTANTS.channels.board?.id &&
				message.author.id === client.user.id) ||
			// Or they reacted to an /explore-potatoes message
			["explore-potatoes", "explorepotatoes"].includes(message.interaction?.commandName || "")
		) {
			// Remove the reaction
			await reaction.users.remove(user);

			return;
		}

		await updateBoard(message);
	}
};
export default event;
