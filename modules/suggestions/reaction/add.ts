import { suggestionsDatabase } from "../getTop.js";
import CONSTANTS from "../../../common/CONSTANTS.js";

import type Event from "../../../common/types/event";

const event: Event<"messageReactionAdd"> = async function event(partialReaction, partialUser) {
	const reaction = partialReaction.partial ? await partialReaction.fetch() : partialReaction;

	const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;

	if (!message.inGuild() || message.guild.id !== CONSTANTS.guild.id) return;

	const user = partialUser.partial ? await partialUser.fetch() : partialUser;

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
};
export default event;
