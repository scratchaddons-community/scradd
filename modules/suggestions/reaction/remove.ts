import { suggestionsDatabase } from "../getTop.js";
import CONSTANTS from "../../../common/CONSTANTS.js";

import type Event from "../../../common/types/event";

const event: Event<"messageReactionRemove"> = async function event(partialReaction) {
	const reaction = partialReaction.partial ? await partialReaction.fetch() : partialReaction;

	const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;

	if (!message.inGuild() || message.guild.id !== CONSTANTS.guild.id) return;

	const defaultEmoji = CONSTANTS.channels.suggestions?.defaultReactionEmoji;
	if (
		message.channel.parent?.id === CONSTANTS.channels.suggestions?.id &&
		[defaultEmoji?.id, defaultEmoji?.name].includes(reaction.emoji.valueOf()) &&
		message.channel.isThread() &&
		message.channel.id === message.id
	) {
		suggestionsDatabase.data = suggestionsDatabase.data.map((suggestion) =>
			suggestion.id === message.id ? { ...suggestion, count: reaction.count } : suggestion,
		);
	}
};
export default event;
