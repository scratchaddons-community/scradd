import { ForumChannel, cleanContent, type Snowflake, type GuildForumTag } from "discord.js";
import config from "../../common/config.js";
import Database from "../../common/database.js";
import { getAllMessages } from "../../util/discord.js";
import { truncateText } from "../../util/text.js";
import constants from "../../common/constants.js";

export const suggestionAnswers = [
	"Unanswered",
	...(config.channels.suggestions
		? getAnswers(config.channels.suggestions).map(([, tag]) => tag.name)
		: []),
] as const;

export const suggestionsDatabase = new Database<{
	answer: typeof suggestionAnswers[number];
	author: Snowflake;
	count: number;
	id: Snowflake;
	title: string | number;
}>("suggestions");
await suggestionsDatabase.init();

export const oldSuggestions = config.channels.old_suggestions
	? (await getAllMessages(config.channels.old_suggestions)).map((message) => {
			const [embed] = message.embeds;

			const segments = message.thread?.name.split(" | ");

			return {
				answer:
					suggestionAnswers.find((answer) =>
						[segments?.[0]?.toLowerCase(), segments?.at(-1)?.toLowerCase()].includes(
							answer.toLowerCase(),
						),
					) ?? suggestionAnswers[0],

				author:
					(message.author.id === constants.users.robotop
						? message.embeds[0]?.footer?.text.split(": ")[1]
						: (message.embeds[0]?.author?.iconURL ?? "").match(/\/(?<userId>\d+)\//)
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
	: [];

export function getAnswer(
	appliedTags: Snowflake[],
	channel: ForumChannel,
): Omit<GuildForumTag, "id"> & { index: number; position: number; id?: GuildForumTag["id"] } {
	const tags = getAnswers(channel);
	const [index, tag] = tags.find(([, tag]) => appliedTags.includes(tag.id)) ?? [
		-1,
		{
			name: channel.id === config.channels.bugs?.id ? "Unconfirmed" : suggestionAnswers[0],
			emoji: { name: "❓", id: null },
			moderated: true,
			id: undefined,
		},
	];

	return { ...tag, index, position: index / (tags.length - 1) };
}

export function getAnswers(channel: ForumChannel) {
	return [...channel.availableTags.entries()].filter(([, tag]) => tag.moderated);
}
