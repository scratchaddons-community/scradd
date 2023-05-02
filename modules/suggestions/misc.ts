import { cleanContent, Snowflake } from "discord.js";
import CONSTANTS from "../../common/CONSTANTS.js";
import Database from "../../common/database.js";
import { getAllMessages } from "../../util/discord.js";
import { truncateText } from "../../util/text.js";

export const suggestionAnswers = [
	"Unanswered",
	"Good Idea",
	"Implemented",
	"In Development",
	"Incompatible",
	"Impractical",
	"Rejected",
	"Impossible",
] as const;

export const suggestionsDatabase = new Database<{
	answer: typeof suggestionAnswers[number];
	author: Snowflake;
	count: number;
	id: Snowflake;
	title: string | number;
}>("suggestions");
await suggestionsDatabase.init();

export const oldSuggestions = CONSTANTS.channels.old_suggestions
	? getAllMessages(CONSTANTS.channels.old_suggestions).then((suggestions) =>
			suggestions.map((message) => {
				const [embed] = message.embeds;

				const segments = message.thread?.name.split(" | ");

				return {
					answer:
						suggestionAnswers.find((answer) =>
							[
								segments?.[0]?.toLowerCase(),
								segments?.at(-1)?.toLowerCase(),
							].includes(answer.toLowerCase()),
						) ?? suggestionAnswers[0],

					author:
						(message.author.id === "323630372531470346"
							? message.embeds[0]?.footer?.text.split(": ")[1]
							: (message.embeds[0]?.author?.iconURL ?? "").match(/\/(?<userId>\d+)\//)
									?.groups?.userId) ?? message.author,

					count:
						(message.reactions.valueOf().first()?.count ?? 0) -
						(message.reactions.valueOf().at(1)?.count ?? 0),

					title: truncateText(
						embed?.title ??
							(embed?.description &&
								cleanContent(embed.description, message.channel)) ??
							embed?.image?.url ??
							message.content,
						100,
					),

					url: message.url,
				};
			}),
	  )
	: [];
