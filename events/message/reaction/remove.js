import { suggestionsDatabase } from "../../../commands/get-top-suggestions.js";
import { BOARD_EMOJI, updateBoard } from "../../../common/board.js";
import CONSTANTS from "../../../common/CONSTANTS.js";

/** @type {import("../../../common/types/event").default<"messageReactionRemove">} */
export default async function event(reaction, user) {
	if (reaction.partial) reaction = await reaction.fetch();

	const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;

	// Ignore other servers
	if (!message.inGuild() || message.guild.id !== process.env.GUILD_ID) return;

	if (user.partial) user = await user.fetch();

	const defaultEmoji = CONSTANTS.channels.suggestions?.defaultReactionEmoji;
	if (
		message.channel.parent?.id === CONSTANTS.channels.suggestions?.id &&
		(defaultEmoji?.id === reaction.emoji.id || defaultEmoji?.name === reaction.emoji.name) &&
		message.channel.isThread() &&
		(await message.channel.fetchStarterMessage())?.id === message.id
	) {
		suggestionsDatabase.data = suggestionsDatabase.data.map((suggestion) =>
			suggestion.id === message.id
				? { ...suggestion, count: reaction.count || 0 }
				: suggestion,
		);
	}

	// Ignore when it’s the wrong emoji
	if (reaction.emoji.name === BOARD_EMOJI) await updateBoard(message);
}
