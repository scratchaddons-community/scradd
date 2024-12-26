/* On production, this file is replaced with another file with the same structure. */

export const greetings = ["Hi"] as const;
export const customResponses: Record<string, string> = {};
export const customNames: Record<string, string> = {};
export const customComments: Record<string, string> = {};
export const customTriggers: readonly string[] = Object.keys({});
export const dadEasterEggCount =
	Object.keys(customResponses).length +
	Object.keys(customNames).length +
	Object.keys(customComments).length +
	customTriggers.length;
