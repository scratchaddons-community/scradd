import type { AnyThreadChannel, MessageReaction } from "discord.js";
import { client } from "strife.js";
import config from "../../common/config.js";
import { suggestionAnswers, suggestionsDatabase } from "./misc.js";

export default async function updateReactions(reaction: MessageReaction) {
	const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;

	if (
		!message.channel.isThread() ||
		message.channel.parent?.id !== config.channels.suggestions?.id ||
		message.channel.id !== message.id
	)
		return true;

	const defaultEmoji = config.channels.suggestions?.defaultReactionEmoji;
	if (
		(defaultEmoji?.id
			? defaultEmoji.id !== reaction.emoji.id
			: defaultEmoji?.name !== reaction.emoji.name) ||
		message.channel.locked
	)
		return false;

	const count = (defaultEmoji?.id && message.reactions.resolve(defaultEmoji.id)?.count) || 0;
	suggestionsDatabase.updateById(
		{ id: message.id, count },
		{ ...getSuggestionData(message.channel) },
	);
	return true;
}

export async function addToDatabase(thread: AnyThreadChannel) {
	if (thread.parent?.id !== config.channels.suggestions?.id) return;

	const defaultEmoji = config.channels.suggestions?.defaultReactionEmoji;
	const message = await thread.fetchStarterMessage().catch(() => void 0);
	const count = (defaultEmoji?.id && message?.reactions.resolve(defaultEmoji.id)?.count) || 0;

	suggestionsDatabase.data = [
		...suggestionsDatabase.data,
		{ ...getSuggestionData(thread), count },
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
