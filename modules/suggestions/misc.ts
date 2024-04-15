import {
	cleanContent,
	type AnyThreadChannel,
	type GuildForumTag,
	type Snowflake,
} from "discord.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import Database from "../../common/database.js";
import { getAllMessages } from "../../util/discord.js";
import { truncateText } from "../../util/text.js";

export const suggestionAnswers = [
	"Unanswered",
	...(config.channels.suggestions?.availableTags
		.filter((tag) => tag.moderated)
		.map((tag) => tag.name) ?? []),
] as const;

export const suggestionsDatabase = new Database<{
	answer: (typeof suggestionAnswers)[number];
	category: string;
	author: Snowflake;
	count: number;
	id: Snowflake;
	title: number | string;
}>("suggestions");
await suggestionsDatabase.init();

export const oldSuggestions =
	config.channels.oldSuggestions ?
		(await getAllMessages(config.channels.oldSuggestions)).map((message) => {
			const [embed] = message.embeds;

			const segments = message.thread?.name.toLowerCase().split(" | ");

			return {
				answer:
					suggestionAnswers.find((answer) => segments?.includes(answer.toLowerCase())) ??
					suggestionAnswers[0],

				author:
					(message.author.id === constants.users.robotop ?
						message.embeds[0]?.footer?.text.split(": ")[1]
					:	/\/(?<userId>\d+)\//.exec(message.embeds[0]?.author?.iconURL ?? "")?.groups
							?.userId) ?? message.author,

				count:
					(message.reactions.valueOf().first()?.count ?? 0) -
					(message.reactions.valueOf().at(1)?.count ?? 0),

				title: truncateText(
					embed?.title ??
						(embed?.description && cleanContent(embed.description, message.channel)) ??
						embed?.image?.url ??
						message.content,
					75,
				),
				old: true,
				...(message.thread ? { id: message.thread.id } : { url: message.url }),
			} as const;
		})
	:	[];

export function getSuggestionData(
	thread: AnyThreadChannel,
):
	| { answer: string; category: string; id: Snowflake; title: string }
	| { author: Snowflake; answer: string; category: string; id: Snowflake; title: string } {
	const { answer, category } = parseSuggestionTags(
		thread.appliedTags,
		config.channels.suggestions?.availableTags ?? [],
		suggestionAnswers[0],
	);
	return {
		answer: answer.name,
		category,
		id: thread.id,
		title: thread.name,
		...(thread.ownerId && { author: thread.ownerId }),
	};
}

export function parseSuggestionTags(
	appliedTags: Snowflake[],
	availableTags: GuildForumTag[],
	defaultAnswer: string,
): {
	answer: Omit<GuildForumTag, "id"> & {
		index: number;
		position: number;
		id?: GuildForumTag["id"];
	};
	category: string;
} {
	const { answer, categories } = availableTags.reduce<{
		answer: Omit<GuildForumTag, "id"> & { id?: GuildForumTag["id"] };
		categories: string[];
	}>(
		({ answer, categories }, tag) =>
			tag.name === "Other" || !appliedTags.includes(tag.id) ? { answer, categories }
			: tag.moderated ? { answer: tag, categories }
			: { answer, categories: [...categories, tag.name] },
		{
			answer: { name: defaultAnswer, emoji: { name: "❓", id: null }, moderated: true },
			categories: [],
		},
	);
	const answers = availableTags.filter((tag) => tag.moderated);
	const index = answers.findIndex((tag) => answer.id === tag.id);
	return {
		answer: { ...answer, index, position: index / (answers.length - 1) },
		category: (categories.length === 1 && categories[0]) || "Other",
	};
}
