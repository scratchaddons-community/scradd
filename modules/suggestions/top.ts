import type { InteractionReplyOptions, User } from "discord.js";

import { ButtonStyle, channelLink, ComponentType, GuildMember, hyperlink } from "discord.js";
import { formatAnyEmoji, paginate } from "strife.js";

import config from "../../common/config.ts";
import constants from "../../common/constants.ts";
import suggestions from "./misc.ts";

export default async function top(
	_?: undefined,
	options: { user?: GuildMember | User; answer?: string; all?: boolean; page?: number } = {},
): Promise<InteractionReplyOptions | undefined> {
	const channel = config.channels.suggestions;
	const displayName = (options.user instanceof GuildMember ? options.user.user : options.user)
		?.displayName;

	return await paginate(
		suggestions
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

		({ answer, author, count, title, ...reference }) =>
			`**${count}** ${
				(!("old" in reference) && formatAnyEmoji(channel?.defaultReactionEmoji)) || "👍"
			} ${hyperlink(
				padTitle(title),
				"url" in reference ? reference.url : channelLink(reference.id, config.guild.id),
				answer,
			)}${options.user ? "" : ` by ${author.toString()}`}`,
		() => void 0,
		{
			title: `Top suggestions${displayName ? ` by ${displayName}` : ""}${
				options.answer && options.user ? " and" : ""
			}${options.answer ? ` answered with ${options.answer}` : ""}`,
			singular: "suggestion",

			user: false,
			rawOffset: options.page ?? 0,
			highlightOffset: false,
			pageLength: 50,

			timeout: constants.collectorTime,
			format: options.user,

			generateComponents() {
				return [
					{
						type: ComponentType.Button,
						style: ButtonStyle.Link,
						label: "Suggestions Site",
						url: `${constants.urls.scradd}/suggestions${
							options.all === undefined ? "" : `?all=${options.all.toString()}`
						}`,
					},
				];
			},
			customComponentLocation: "below",
		},
	);
}

/** @todo - Strip full links, they can’t be escaped. */
function padTitle(title: number | string): string {
	const left = countOccurrences(title.toString(), "[");
	const right = countOccurrences(title.toString(), "]");
	return title + "]".repeat(Math.max(0, left - right));
}

function countOccurrences(string: string, substring: string): number {
	return string.split(substring).length - 1;
}
