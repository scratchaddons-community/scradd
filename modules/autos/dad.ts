/* On production, this file is replaced with another file with the same structure. */

import type { GuildMember } from "discord.js";
import {
	customComments,
	customNames,
	customResponses,
	customTriggers,
	greetings,
} from "./autos-data.js";

export default function dad(name: string, _: GuildMember): string | readonly (number | string)[] {
	const split = name.split(/[\b\s]+/);
	const firstName =
		split.find(
			(word) =>
				customResponses[word] ||
				customNames[word] ||
				customComments[word] ||
				customTriggers.includes(word),
		) ||
		split[0] ||
		name;
	const customName = customNames[firstName] || name;
	const comment = customComments[firstName] || "I’m Scradd!";

	const greetingIndex = Math.floor(Math.random() * greetings.length);
	const greeting = greetings[greetingIndex] ?? greetings[0];

	const response =
		customResponses[firstName] ||
		`${greeting} ${customName}${customTriggers.includes(firstName) ? "!" : ","} ${comment}`;

	return response;
}
