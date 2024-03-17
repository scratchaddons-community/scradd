import didYouMean, { ReturnTypeEnums, ThresholdTypeEnums } from "didyoumean2";
import {
	channelLink,
	hyperlink,
	type APIEmbedField,
	type AnyThreadChannel,
	type BaseMessageOptions,
	type MessageReaction,
} from "discord.js";
import { matchSorter } from "match-sorter";
import { client } from "strife.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import { formatAnyEmoji } from "../../util/markdown.js";
import { getSuggestionData, suggestionAnswers, suggestionsDatabase } from "./misc.js";

export async function addToDatabase(thread: AnyThreadChannel): Promise<void> {
	if (thread.parent?.id !== config.channels.suggestions?.id) return;

	const suggestionData = getSuggestionData(thread);
	const dupes = await findDuplicates(suggestionData);
	if (dupes) await thread.send(dupes);

	const message = await thread.fetchStarterMessage().catch(() => void 0);
	const defaultEmoji =
		config.channels.suggestions?.defaultReactionEmoji?.id ||
		config.channels.suggestions?.defaultReactionEmoji?.name ||
		"👍";
	const count = message?.reactions.resolve(defaultEmoji)?.count || 0;
	suggestionsDatabase.data = [
		...suggestionsDatabase.data,
		{ ...suggestionData, count, author: thread.ownerId ?? client.user.id },
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
		(defaultEmoji?.id
			? defaultEmoji.id !== reaction.emoji.id
			: defaultEmoji?.name !== reaction.emoji.name) ||
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

async function findDuplicates(newSuggestion: {
	title: string;
	category: string;
}): Promise<BaseMessageOptions | undefined> {
	const data = suggestionsDatabase.data.reduce<
		(typeof suggestionsDatabase["data"][number] & { originalTitle: string })[]
	>(
		(suggestions, { title, ...suggestion }) =>
			suggestion.category === "Other" ||
			newSuggestion.category === "Other" ||
			suggestion.category === newSuggestion.category
				? [
						...suggestions,
						{ ...suggestion, title: shortenTitle(title), originalTitle: `${title}` },
				  ]
				: suggestions,
		[],
	);

	const title = shortenTitle(newSuggestion.title);

	const dupes = [
		...matchSorter(data, title, { keys: ["title"] }),
		...didYouMean(title, data, {
			matchPath: ["title"],
			returnType: ReturnTypeEnums.ALL_SORTED_MATCHES,
			thresholdType: ThresholdTypeEnums.SIMILARITY,
			threshold: 0.5,
		}),
	]
		.filter(({ id }, index, array) => index === array.findIndex((found) => found.id === id))
		.slice(0, 30)
		.map(async (suggestion) => ({
			answer: suggestion.answer,

			markdown: `**${suggestion.count} ${
				config.channels.suggestions?.defaultReactionEmoji?.id
					? formatAnyEmoji(config.channels.suggestions.defaultReactionEmoji)
					: config.channels.suggestions?.defaultReactionEmoji?.name || "👍"
			}** ${hyperlink(
				suggestion.originalTitle,
				channelLink(suggestion.id, config.guild.id),
				(await client.users.fetch(suggestion.author).catch(() => void 0))?.displayName ??
					"",
			)}`,
		}));
	if (dupes.length === 0) return;
	const links = (await Promise.all(dupes)).reduce<Record<string, string[]>>(
		(accumulator, { answer, markdown }) => {
			(accumulator[answer] ??= []).push(markdown);
			return accumulator;
		},
		{},
	);
	return {
		embeds: [
			{
				title: "Possible Duplicates Detected",
				fields: suggestionAnswers
					.map((answer) => ({
						name: answer,
						inline: true,
						value: links[answer]?.slice(0, 4).join("\n"),
					}))
					.filter((field): field is Required<APIEmbedField> => field.value !== undefined),
				color: constants.themeColor,
				footer: {
					text: "Is one of these the same as your suggestion? If so, please say and someone will lock this when they can. Please search for duplicates before making suggestions!",
				},
			},
		],
	};
}

function shortenTitle(title: number | string): string {
	const stringified = `${title}`;
	if (stringified.length < 15) return stringified;
	const shortened = stringified.replaceAll(/\s*\b\S{1,3}\b\s*/g, " ").trim();
	return shortened.split(/[\s\b]+/g).length < 2 ? stringified : shortened;
}
