import { BOARD_EMOJI, updateBoard } from "../../../common/board.js";
import { SUGGESTION_EMOJIS } from "../../../commands/suggestion.js";
import warn from "../../../common/moderation/warns.js";
import { censor, badWordsAllowed } from "../../../common/moderation/automod.js";
import CONSTANTS from "../../../common/CONSTANTS.js";
import client from "../../../client.js";

/** @type {import("../../../common/types/event").default<"messageReactionAdd">} */
export default async function event(reaction, user) {
	if (reaction.partial) reaction = await reaction.fetch();

	const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;

	// Ignore other servers
	if (message.guild?.id !== process.env.GUILD_ID) return;

	if (user.partial) user = await user.fetch();

	const { emoji } = reaction;

	if (emoji.name && !badWordsAllowed(message.channel)) {
		const censored = censor(emoji.name);
		if (censored) {
			await message.channel.send(
				`${CONSTANTS.emojis.statuses.no} ${user.toString()}, language!`,
			);
			await warn(
				user,
				`Watch your language!`,
				censored.strikes,
				"Reacted with:\n:" + emoji.name + ":",
			);
			await reaction.remove();
			return;
		}
	}

	if (
		reaction.message.channel.id === CONSTANTS.channels.suggestions?.id &&
		user.id !== client?.user?.id
	) {
		const otherReaction = SUGGESTION_EMOJIS.find((emojis) =>
			emojis.includes(emoji.id ?? emoji.name ?? ""),
		)?.find((otherEmoji) => otherEmoji !== (emoji.id ?? emoji.name ?? ""));

		await reaction.message.reactions
			.resolve(otherReaction || (emoji.id ?? emoji.name ?? ""))
			?.users.remove(user);
	}

	if (
		// Ignore when it’s the wrong emoji
		emoji.name !== BOARD_EMOJI
	)
		return;

	if (
		// If they self-reacted
		(user.id === message.author.id && process.env.NODE_ENV === "production") ||
		// Or if they reacted to a message on the board
		(message.channel.id === CONSTANTS.channels.board?.id &&
			message.author.id === client.user?.id) ||
		// Or they reacted to an /explore-potatoes message
		["explore-potatoes", "explorepotatoes"].includes(message.interaction?.commandName || "")
	) {
		// Remove the reaction
		await reaction.users.remove(user);

		return;
	}

	await updateBoard(message);
}
