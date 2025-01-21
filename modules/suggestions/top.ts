import { channelLink, hyperlink } from "discord.js";
import { footerSeperator, formatAnyEmoji } from "strife.js";

import config from "../../common/config.ts";
import suggestions from "./misc.ts";

export default function top(rawOffset = 0): { list: string; pageInfo: string } {
	if (!suggestions.length)
		return {
			list: `No suggestions found!`,
			pageInfo: `Page 1/0${footerSeperator}0 suggestions`,
		};

	const pageLength = 50;

	const pageCount = Math.ceil(suggestions.length / pageLength);
	const offset = Math.floor(rawOffset / pageLength) * pageLength;

	const lines = suggestions
		.toSorted((suggestionOne, suggestionTwo) => suggestionTwo.count - suggestionOne.count)
		.filter((_, index) => index >= offset && index < offset + pageLength)
		.map(({ answer, author, count, title, ...reference }, index) => {
			const line = `${index + offset + 1}. **${count}** ${
				(!("old" in reference) &&
					formatAnyEmoji(config.channels.suggestions?.defaultReactionEmoji)) ||
				"👍"
			} ${hyperlink(
				padTitle(title),
				"url" in reference ? reference.url : channelLink(reference.id, config.guild.id),
				answer,
			)} by ${author.toString()}`;
			return line;
		});

	return {
		list: lines.join("\n"),
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
