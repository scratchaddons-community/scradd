import type { GuildMember, Snowflake } from "discord.js";

export function dad(
	name: string,
	_: GuildMember,
): string | readonly [string, ...(number | string)[], string] {
	const split = name.split(/\b/);
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

	return (
		customResponses[firstName] ||
		`${greetings[Math.floor(Math.random() * greetings.length)]} ${
			customNames[firstName] || name
		}${customTriggers.includes(firstName) ? "!" : ","} ${
			customComments[firstName] || "I’m Scradd!"
		}`
	);
}

const greetings = ["Hi"] as const;
const customResponses: Record<string, string> = {};
const customNames: Record<string, string> = {};
const customComments: Record<string, string> = {};
const customTriggers: string[] = Object.keys({});
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
	string[] | string,
	...(
		| RegExp
		| string
		| [RegExp | string, "full" | "negative" | "partial" | "plural" | "raw"]
		| [Snowflake, "ping"]
	)[],
][] = [];
