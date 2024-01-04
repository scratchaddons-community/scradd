import {
	GuildMember,
	hyperlink,
	type User,
	type RepliableInteraction,
	channelLink,
	formatEmoji,
} from "discord.js";
import config from "../../common/config.js";
import { paginate } from "../../util/discord.js";
import { mentionUser } from "../settings.js";
import { oldSuggestions, suggestionsDatabase } from "./misc.js";

export default async function top(
	interaction: RepliableInteraction,
	options: { user?: GuildMember | User; answer?: string; all?: boolean },
) {
	const { suggestions } = config.channels;
	const user = options.user instanceof GuildMember ? options.user.user : options.user;

	await paginate(
		[...oldSuggestions, ...suggestionsDatabase.data]
			.filter(
				(suggestion) =>
					(options.answer ? suggestion.answer === options.answer : true) &&
					(user ? suggestion.author.valueOf() === user.id : true) &&
					(options.all ||
						!("old" in suggestion) ||
						["Unnswered", "Good Idea", "In Development", "Implemented"].includes(
							suggestion.answer,
						)),
			)
			.toSorted((suggestionOne, suggestionTwo) => suggestionTwo.count - suggestionOne.count),
		async ({ answer, author, count, title, ...reference }) =>
			`**${count}** ${
				"old" in reference
					? "👍"
					: suggestions?.defaultReactionEmoji?.id
					? formatEmoji(suggestions.defaultReactionEmoji.id)
					: suggestions?.defaultReactionEmoji?.name
			} ${hyperlink(
				padTitle(title),
				"url" in reference ? reference.url : channelLink(config.guild.id, reference.id),
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
/** @todo - Strip full links, they can't be escaped. */
function padTitle(title: number | string) {
	const left = countOccurrences(`${title}`, "[");
	const right = countOccurrences(`${title}`, "]");
	return title + "]".repeat(Math.max(0, left - right));
}

function countOccurrences(string: string, substring: string) {
	return string.split(substring).length - 1;
}
