import type { User } from "discord.js";

export function dad(name: string, _: User) {
	return `Hi ${name.split(/\b/)[0] ?? name}! I’m Scradd!`;
}
export const dadEasterEggCount = 0;

/**
 * - `word`
 * - `plural` (`true`)
 * - `partial` (`content.includes`)
 * - `raw` (`messsge.content`)
 * - `full` (`content ===`)
 * - `negative` - overrides all (`&& !content.includes`)
 */
export const autoreactions: [
	string | string[],
	...(string | RegExp | [string | RegExp, "plural" | "partial" | "raw" | "full" | "negative"])[],
][] = [];
