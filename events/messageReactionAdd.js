import {
	BOARD_CHANNEL,
	BOARD_EMOJI,
	sourceToBoardMessage,
	postMessageToBoard,
	MIN_REACTIONS,
	updateReactionCount,
} from "../common/board.js";
import { OLD_EMOJIS as SUGGESTION_EMOJIS } from "../commands/suggestion.js";

/** @type {import("../types/event").default<"messageReactionAdd">} */
const event = {
	async event(reaction, user) {
		if (reaction.partial) reaction = await reaction.fetch();

		const message = reaction.message.partial
			? await reaction.message.fetch()
			: reaction.message;

		if (user.partial) user = await user.fetch();

		const emoji = reaction.emoji;
		if (reaction.message.channel.id === process.env.SUGGESTION_CHANNEL && !reaction.me) {
			const otherReaction = SUGGESTION_EMOJIS.find((emojis) =>
				emojis.includes(emoji.id ?? emoji.name ?? ""),
			)?.find((otherEmoji) => otherEmoji !== (emoji.id ?? emoji.name ?? ""));

			if (otherReaction) {
				await reaction.message.reactions.resolve(otherReaction)?.users.remove(user);
			}
		}

		if (
			// Ignore other servers
			message.guild?.id !== process.env.GUILD_ID ||
			// Ignore when it’s the wrong emoji
			reaction.emoji.name !== BOARD_EMOJI
		)
			return;

		if (
			// If they self-reacted
			(user.id === message.author.id && process.env.NODE_ENV === "production") ||
			// Or if they reacted to a message on the board
			(message.channel.id === BOARD_CHANNEL &&
				message.author.id === message.client.user?.id) ||
			// Or they reacted to an /explore-potatoes message
			(message.interaction?.commandName === "explore-potatoes" && message.embeds.length > 0)
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
