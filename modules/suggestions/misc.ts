import type { GuildForumTag, Snowflake } from "discord.js";

import assert from "node:assert";

import { client } from "strife.js";

export const suggestionAnswers = ["Unanswered", "Good Idea", "In Development"] as const;

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

const channel = await client.channels.fetch("1020381639748096050");
assert(channel?.isTextBased());
const message = await channel.messages.fetch("1331287625851605096");
const attachment = message.attachments.first()?.url;
assert(attachment);

const suggestions = await fetch(attachment).then(
	(response) =>
		response.json() as Promise<
			{
				answer: (typeof suggestionAnswers)[number];
				count: number | null;
				title: string;
				author: Snowflake;
				id: Snowflake;
				old?: true;
			}[]
		>,
);
export default suggestions;
