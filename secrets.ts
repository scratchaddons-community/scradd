export function dad(name: string, _: string) {
	return `Hi ${name}!I’m Scradd!`;
}

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

export const isAprilFools = false;
