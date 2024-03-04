import {
	GuildMember,
	hyperlink,
	type User,
	type RepliableInteraction,
	channelLink,
} from "discord.js";
import config from "../../common/config.js";
import { paginate } from "../../util/discord.js";
import { mentionUser } from "../settings.js";
import { oldSuggestions, suggestionsDatabase } from "./misc.js";
import { formatAnyEmoji } from "../../util/markdown.js";

export default async function top(
	interaction: RepliableInteraction,
	options: { user?: GuildMember | User; answer?: string; all?: boolean },
): Promise<void> {
	const { suggestions } = config.channels;
	const user = options.user instanceof GuildMember ? options.user.user : options.user;

	await paginate(
		[...oldSuggestions, ...suggestionsDatabase.data]
			.filter(
				(suggestion) =>
					(options.answer
						? suggestion.answer === options.answer
						: options.all ||
						  !("old" in suggestion) ||
						  ["Unanswered", "Good Idea", "In Development"].includes(
								suggestion.answer,
						  )) &&
					(options.user ? suggestion.author.valueOf() === options.user.id : true),
			)
			.toSorted((suggestionOne, suggestionTwo) => suggestionTwo.count - suggestionOne.count),

		async ({ answer, author, count, title, ...reference }) =>
			`**${count}** ${
				!("old" in reference) &&
				(suggestions?.defaultReactionEmoji?.name || suggestions?.defaultReactionEmoji?.id)
					? formatAnyEmoji(suggestions.defaultReactionEmoji)
					: "👍"
			} ${hyperlink(
				padTitle(title),
				"url" in reference ? reference.url : channelLink(reference.id, config.guild.id),
				answer,
			)}${
				user
					? ""
					: ` by ${await mentionUser(
							author,
							interaction.user,
							interaction.guild ?? config.guild,
					  )}`
			}`,

		(data) => interaction.reply(data),
		{
			title: `Top suggestions${user ? ` by ${user.displayName}` : ""}${
				options.answer && user ? " and" : ""
			}${options.answer ? ` answered with ${options.answer}` : ""}`,
			format: user,
			singular: "suggestion",
			user: interaction.user,
			perPage: 15,
		},
	);
}

/** @todo - Strip full links, they can’t be escaped. */
function padTitle(title: number | string): string {
	const left = countOccurrences(`${title}`, "[");
	const right = countOccurrences(`${title}`, "]");
	return title + "]".repeat(Math.max(0, left - right));
}

function countOccurrences(string: string, substring: string): number {
	return string.split(substring).length - 1;
}
