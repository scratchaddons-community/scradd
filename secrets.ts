import type { User } from "discord.js";

export function dad(name: string, _: User) {
	const split = name.split(/\b/);
	const firstName =
		split.find(
			(word) =>
				customResponses[word] ||
				customNames[word] ||
				customComments[word] ||
				customTriggers.includes(word),
		) ??
		split[0] ??
		name;
	const customName = customNames[firstName] ?? name;
	const comment = customComments[firstName] ?? "I’m Scradd!";

	const greetingIndex = Math.floor(Math.random() * greetings.length);
	const greeting = greetings[greetingIndex];

	const response =
		customResponses[firstName] ??
		`${greeting} ${customName}, ${comment}`;

	return response;
}

const greetings = ["Hi"] as const;
const customResponses: Record<string, string> = {};
const customNames: Record<string, string> = {};
const customComments: Record<string, string> = {};
const customTriggers: string[] = [];
export const dadEasterEggCount =
	Object.keys(customResponses).length +
	Object.keys(customNames).length +
	Object.keys(customComments).length +
	customTriggers.length;

// const ignoreTriggers = ["kill", "suicid", "depress", "pain", "sick", "abus", "sad", "bleed"] as const; // todo

/**
 * - `word`
 * - `plural` (`true`)
 * - `partial` (`content.includes`)
 * - `raw` (`messsge.content`)
 * - `full` (`content ===`)
 * - `negative` - overrides all (`&& !content.includes`)
 * - `ping` - only direct pings (`message.mentions.has`)
 */
export const autoreactions: [
	string | string[],
	...(
		| string
		| RegExp
		| [string | RegExp, "plural" | "partial" | "raw" | "full" | "negative"]
		| [string, "ping"]
	)[],
][] = [];
