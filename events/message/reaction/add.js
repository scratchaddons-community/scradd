import {
	BOARD_CHANNEL,
	BOARD_EMOJI,
	sourceToBoardMessage,
	postMessageToBoard,
	MIN_REACTIONS,
	updateReactionCount,
} from "../../../common/board.js";
import { SUGGESTION_EMOJIS } from "../../../commands/suggestion.js";
import warn from "../../../common/moderation/warns.js";
import { censor, badWordsAllowed } from "../../../common/moderation/automod.js";

/** @type {import("../../../types/event").default<"messageReactionAdd">} */
const event = {
	async event(reaction, user) {
		if (reaction.partial) reaction = await reaction.fetch();

		const message = reaction.message.partial
			? await reaction.message.fetch()
			: reaction.message;

		// Ignore other servers
		if (message.guild?.id !== process.env.GUILD_ID) return;

		if (user.partial) user = await user.fetch();

		const { emoji } = reaction;

		if (emoji.name && !badWordsAllowed(message.channel)) {
			const censored = censor(emoji.name);
			if (censored) {
				await message.channel.send({ content: `${user.toString()}, language!` });
				await warn(user, "Watch your language!", censored.strikes);
				await reaction.remove();
				return;
			}
		}

		if (reaction.message.channel.id === process.env.SUGGESTION_CHANNEL && !reaction.me) {
			const otherReaction = SUGGESTION_EMOJIS.find((emojis) =>
				emojis.includes(emoji.id ?? emoji.name ?? ""),
			)?.find((otherEmoji) => otherEmoji !== (emoji.id ?? emoji.name ?? ""));

			if (otherReaction) {
				await reaction.message.reactions.resolve(otherReaction)?.users.remove(user);
			}
		}

		if (
			// Ignore when it’s the wrong emoji
			emoji.name !== BOARD_EMOJI
		)
			return;

		if (
			// if a bot reacted
			user.bot ||
			// Or if they self-reacted
			(user.id === message.author.id && process.env.NODE_ENV === "production") ||
			// Or if they reacted to a message on the board
			(message.channel.id === BOARD_CHANNEL && message.author.id === this.user.id) ||
			// Or they reacted to an /explorepotatoes message
			(message.interaction?.commandName === "explorepotatoes" && message.embeds.length > 0)
		) {
			// Remove the reaction
			await reaction.users.remove(user);

			return;
		}

		const boardMessage = await sourceToBoardMessage(message);

		const fetched = message.reactions.resolve(BOARD_EMOJI);
		const count = fetched?.count ?? 0;

		if (boardMessage?.embeds[0]) {
			await updateReactionCount(count, boardMessage);
		} else {
			if (count < MIN_REACTIONS) return;

			await postMessageToBoard(message);
		}
	},
};

export default event;
