import type { GuildMember } from "discord.js";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function dad(name: string, _: GuildMember) {
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
	const customName = customNames[firstName] || name;
	const comment = customComments[firstName] || "I’m Scradd!";

	const greetingIndex = Math.floor(Math.random() * greetings.length);
	const greeting = greetings[greetingIndex];

	return (
		customResponses[firstName] ??
		`${greeting} ${customName}${customTriggers.includes(firstName) ? "!" : ","} ${comment}`
	);
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
