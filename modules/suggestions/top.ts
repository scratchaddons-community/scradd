import { channelLink, hyperlink, userMention } from "discord.js";
import { footerSeperator, formatAnyEmoji } from "strife.js";

import config from "../../common/config.ts";
import suggestions from "./misc.ts";

export default function top(page = 0): { list: string; pageInfo: string } {
	const pageLength = 50;

	const pageCount = Math.ceil(suggestions.length / pageLength);
	const offset = Math.floor((page * pageLength) / pageLength) * pageLength;

	const lines = suggestions
		.toSorted(
			(suggestionOne, suggestionTwo) =>
				(suggestionTwo.count ?? 0) - (suggestionOne.count ?? 0),
		)
		.filter((_, index) => index >= offset && index < offset + pageLength)
		.map(
			(suggestion, index) =>
				`${index + offset + 1}. **${(suggestion.count ?? 0).toLocaleString()}** ${
					(!suggestion.old &&
						formatAnyEmoji(config.channels.suggestions?.defaultReactionEmoji)) ||
					"👍"
				} ${hyperlink(
					padTitle(suggestion.title),
					channelLink(suggestion.id, config.guild.id),
					suggestion.answer,
				)} by ${userMention(suggestion.author)}`,
		);

	return {
		list: lines.join("\n") || "No suggestions found!",
		pageInfo: `Page ${offset / pageLength + 1}/${pageCount}${
			footerSeperator
		}${suggestions.length.toLocaleString()} ${suggestions.length === 1 ? "suggestion" : `suggestions`}`,
	};
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
