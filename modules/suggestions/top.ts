import {
	ButtonStyle,
	ComponentType,
	GuildMember,
	channelLink,
	hyperlink,
	type InteractionReplyOptions,
	type RepliableInteraction,
	type User,
} from "discord.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import { paginate, formatAnyEmoji } from "strife.js";
import { mentionUser } from "../settings.js";
import { oldSuggestions, suggestionsDatabase } from "./misc.js";

export default async function top(
	interaction?: RepliableInteraction,
	options: { user?: GuildMember | User; answer?: string; all?: boolean; page?: number } = {},
): Promise<InteractionReplyOptions | undefined> {
	const message = await interaction?.deferReply({ fetchReply: true });

	const { suggestions } = config.channels;
	const displayName = (options.user instanceof GuildMember ? options.user.user : options.user)
		?.displayName;

	return await paginate(
		[...oldSuggestions, ...suggestionsDatabase.data]
			.filter(
				(suggestion) =>
					(options.answer ?
						suggestion.answer === options.answer
					:	options.all ||
						!("old" in suggestion) ||
						["Unanswered", "Good Idea", "In Development"].includes(
							suggestion.answer,
						)) &&
					(options.user ? suggestion.author.valueOf() === options.user.id : true),
			)
			.toSorted((suggestionOne, suggestionTwo) => suggestionTwo.count - suggestionOne.count),

		async ({ answer, author, count, title, ...reference }) =>
			`**${count}** ${
				(!("old" in reference) && formatAnyEmoji(suggestions?.defaultReactionEmoji)) || "👍"
			} ${hyperlink(
				padTitle(title),
				"url" in reference ? reference.url : channelLink(reference.id, config.guild.id),
				answer,
			)}${options.user ? "" : ` by ${await mentionUser(author, interaction?.user)}`}`,
		(data) => message?.edit(data),
		{
			title: `Top suggestions${displayName ? ` by ${displayName}` : ""}${
				options.answer && options.user ? " and" : ""
			}${options.answer ? ` answered with ${options.answer}` : ""}`,
			singular: "suggestion",

			user: interaction?.user ?? false,
			rawOffset: (options.page ?? 0) * (interaction ? 15 : 25),
			highlightOffset: false,
			pageLength: interaction ? 15 : 25,

			timeout: constants.collectorTime,
			format: options.user,

			generateComponents() {
				return [
					{
						type: ComponentType.Button,
						style: ButtonStyle.Link,
						label: "Suggestions Site",
						url: `${constants.domains.scradd}/suggestions${options.all === undefined ? "" : `?all=${options.all.toString()}`}`,
					},
				];
			},
			customComponentLocation: "below",
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
