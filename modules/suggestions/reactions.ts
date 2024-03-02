import type { AnyThreadChannel, MessageReaction, Snowflake } from "discord.js";
import { client } from "strife.js";
import config from "../../common/config.js";
import { suggestionAnswers, suggestionsDatabase } from "./misc.js";
import {stringSimilarity} from "string-similarity-js";

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

export async function addToDatabase(thread: AnyThreadChannel): Promise<void> {
	if (thread.parent?.id !== config.channels.suggestions?.id) return;

	const defaultEmoji = config.channels.suggestions?.defaultReactionEmoji;
	const message = await thread.fetchStarterMessage().catch(() => void 0);
	const count = (defaultEmoji?.id && message?.reactions.resolve(defaultEmoji.id)?.count) || 0;
	const suggestionData = getSuggestionData(thread)
	suggestionsDatabase.data = [
		...suggestionsDatabase.data,
		{ ...suggestionData, count },
	];
	const data =  suggestionsDatabase.data as {
		answer: typeof suggestionAnswers[number];
		author: Snowflake;
		count: number;
		id: Snowflake;
		title: number | string;
	}[]

	const dupes = await findDuplicates(suggestionData, data)
	if (dupes.length == 0) return
	const links = dupes.toSorted((a, b) => a.score - b.score).toReversed().map((dupe)=>{ return `<#${dupe.id}> ${dupe.answer}`})
	thread.send(`
	## Possible dupes found:\n${links.join("\n")}
	`)
}

export async function findDuplicates(newSuggestion: {
    id: string;
    title: string | number;
}, database: {
	id: Snowflake;
	title: number | string;
	answer: string
}[]) {
   let possibleDupes:{
	id: Snowflake;
	title: number | string;
	answer: string;
	score: number;
}[] = []
    for (const dbSuggestion of database) {
        if (dbSuggestion.id == newSuggestion.id) continue
        const similarityThreshold = 0.5;
        const similarity = stringSimilarity(`${newSuggestion.title}`, `${dbSuggestion.title}`)
        if (similarity > similarityThreshold) {
            possibleDupes.push({...dbSuggestion, score:similarity})
        }
    }

    return possibleDupes
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
