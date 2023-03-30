import client from "../../../client.js";
import { suggestionsDatabase } from "../../../commands/get-top-suggestions.js";
import updateBoard, { BOARD_EMOJI } from "../../../common/board.js";
import censor, { badWordsAllowed } from "../../../common/language.js";
import CONSTANTS from "../../../common/CONSTANTS.js";
import warn from "../../../common/punishments.js";

import type Event from "../../../common/types/event";

const event: Event<"messageReactionAdd"> = async function event(partialReaction, partialUser) {
	const reaction = partialReaction.partial ? await partialReaction.fetch() : partialReaction;

	const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;

	if (!message.inGuild() || message.guild.id !== CONSTANTS.guild.id) return;

	const user = partialUser.partial ? await partialUser.fetch() : partialUser;

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
		message.channel.id === message.id
	) {
		const defaultEmoji = CONSTANTS.channels.suggestions?.defaultReactionEmoji;
		if ([defaultEmoji?.id, defaultEmoji?.name].includes(reaction.emoji.valueOf())) {
			suggestionsDatabase.data = suggestionsDatabase.data.map((suggestion) =>
				suggestion.id === message.id
					? { ...suggestion, count: reaction.count }
					: suggestion,
			);
		} else {
			await message.reactions.resolve(reaction).users.remove(user);
		}
	}

	if (
		message.interaction?.commandName === "poll" &&
		message.embeds[0]?.footer?.text &&
		user.id !== client.user.id
	) {
		const emojis = message.embeds[0].description?.match(/^[^\s]+/gm);
		const isPollEmoji = emojis?.includes(emoji.name || "");
		if (isPollEmoji) {
			message.reactions
				.valueOf()
				.find(
					(otherReaction) =>
						otherReaction.emoji.name !== emoji.name &&
						emojis?.includes(otherReaction.emoji.name || "") &&
						otherReaction.users.resolve(user.id),
				)
				?.users.remove(user);
		}
	}

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
