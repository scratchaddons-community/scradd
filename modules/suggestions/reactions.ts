import type { AnyThreadChannel, MessageReaction } from "discord.js";
import { client } from "strife.js";
import config from "../../common/config.js";
import { suggestionAnswers, suggestionsDatabase } from "./misc.js";

export default async function updateReactions(reaction: MessageReaction) {
	const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;

	if (
		message.channel.isThread() &&
		message.channel.parent?.id === config.channels.suggestions?.id &&
		message.channel.id === message.id
	) {
		const defaultEmoji = config.channels.suggestions?.defaultReactionEmoji;
		if (
			(defaultEmoji?.id
				? defaultEmoji.id === reaction.emoji.id
				: defaultEmoji?.name === reaction.emoji.name) &&
			!message.channel.locked
		) {
			suggestionsDatabase.updateById(
				{ id: message.id, count: reaction.count },
				{ ...getSuggestionData(message.channel) },
			);
			return true;
		} else {
			return false;
		}
	}
	return true;
}

export function addToDatabase(thread: AnyThreadChannel) {
	suggestionsDatabase.data = [
		...suggestionsDatabase.data,
		{ ...getSuggestionData(thread), count: 0 },
	];
}

export function getSuggestionData(
	thread: AnyThreadChannel,
): Omit<typeof suggestionsDatabase.data[number], "count"> {
	return {
		answer:
			config.channels.suggestions?.availableTags.find(
				(tag) =>
					suggestionAnswers.includes(tag.name) && thread.appliedTags.includes(tag.id),
			)?.name ?? suggestionAnswers[0],
		author: thread.ownerId ?? client.user.id,
		id: thread.id,
		title: thread.name,
	};
}
