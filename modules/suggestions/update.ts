import type { AnyThreadChannel, MessageReaction } from "discord.js";

import { client } from "strife.js";

import config from "../../common/config.js";
import { getSuggestionData, suggestionsDatabase } from "./misc.js";

export async function addToDatabase(thread: AnyThreadChannel): Promise<void> {
	if (thread.parent?.id !== config.channels.suggestions?.id) return;

	const message = await thread.fetchStarterMessage().catch(() => void 0);
	const defaultEmoji =
		config.channels.suggestions?.defaultReactionEmoji?.id ||
		config.channels.suggestions?.defaultReactionEmoji?.name ||
		"👍";
	const count = message?.reactions.resolve(defaultEmoji)?.count || 0;
	suggestionsDatabase.data = [
		...suggestionsDatabase.data,
		{ count, author: client.user.id, ...getSuggestionData(thread) },
	];
}

export default async function updateReactions(reaction: MessageReaction): Promise<boolean> {
	const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;

	if (
		!message.channel.isThread() ||
		message.channel.parent?.id !== config.channels.suggestions?.id ||
		message.channel.id !== message.id
	)
		return true;

	const defaultEmoji = config.channels.suggestions?.defaultReactionEmoji;
	if (
		(defaultEmoji?.id ?
			defaultEmoji.id !== reaction.emoji.id
		:	defaultEmoji?.name !== reaction.emoji.name) ||
		message.channel.locked
	)
		return false;

	const count = (defaultEmoji?.id && message.reactions.resolve(defaultEmoji.id)?.count) || 0;
	suggestionsDatabase.updateById(
		{ count, ...getSuggestionData(message.channel) },
		{ author: message.channel.ownerId ?? client.user.id },
	);
	return true;
}

export async function updateSuggestion(
	_: AnyThreadChannel,
	newThread: AnyThreadChannel,
): Promise<void> {
	if (!config.channels.suggestions || newThread.parent?.id !== config.channels.suggestions.id)
		return;
	if (newThread.locked) {
		suggestionsDatabase.data = suggestionsDatabase.data.filter(({ id }) => id !== newThread.id);
		return;
	}

	const defaultEmoji = config.channels.suggestions.defaultReactionEmoji;
	const message = await newThread.fetchStarterMessage().catch(() => void 0);
	const count = (defaultEmoji?.id && message?.reactions.resolve(defaultEmoji.id)?.count) || 0;

	suggestionsDatabase.updateById(
		{ count, ...getSuggestionData(newThread) },
		{ author: newThread.ownerId ?? client.user.id },
	);
}
