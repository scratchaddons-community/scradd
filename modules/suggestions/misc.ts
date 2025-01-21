import type { GuildForumTag, Snowflake } from "discord.js";

import { cleanContent } from "discord.js";

import config from "../../common/config.ts";
import Database, { databaseThread } from "../../common/database.ts";
import { getAllMessages } from "../../util/discord.ts";
import { truncateText } from "../../util/text.ts";

export const suggestionAnswers = [
	"Unanswered",
	...(config.channels.suggestions?.availableTags
		.filter((tag) => tag.moderated)
		.map((tag) => tag.name) ?? []),
] as const;

const suggestionsDatabase = new Database<{
	answer: (typeof suggestionAnswers)[number];
	category: string;
	author: Snowflake;
	count: number;
	id: Snowflake;
	title: number | string;
}>("suggestions");
await suggestionsDatabase.init();

const oldSuggestions =
	config.channels.oldSuggestions ?
		(await getAllMessages(config.channels.oldSuggestions)).map((message) => {
			const [embed] = message.embeds;

			const segments = message.thread?.name.toLowerCase().split(" | ");

			return {
				answer:
					suggestionAnswers.find((answer) => segments?.includes(answer.toLowerCase())) ??
					suggestionAnswers[0],

				author:
					(message.author.id === "323630372531470346" ?
						embed?.footer?.text.split(": ")[1]
					:	/(?:users|avatars)\/(?<userId>\d+)\//.exec(embed?.author?.iconURL ?? "")
							?.groups?.userId) ?? message.author,

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

export function parseSuggestionTags(
	appliedTags: Snowflake[],
	availableTags: GuildForumTag[],
	defaultAnswer = "Unconfirmed",
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

const suggestions = [...suggestionsDatabase.data, ...oldSuggestions].filter((suggestion) =>
	["Unanswered", "Good Idea", "In Development"].includes(suggestion.answer),
);
export default suggestions;
await databaseThread.send({
	files: [{ name: "suggestions.json", attachment: Buffer.from(JSON.stringify(suggestions)) }],
});
