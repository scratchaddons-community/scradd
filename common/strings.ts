/** On production, this file is replaced with another file with the same structure. */

export const joins = ["Welcome {{{MEMBER}}}, you’re our **{{{COUNT}}}** member!"] as const;
export const bans = ["Oop, **{{{MEMBER}}}** was banned."] as const;
export const leaves = ["Rip, **{{{MEMBER}}}** left :("] as const;

export const statuses = ["Watching the SA server!"] as const;

export const uwuReplacements: Record<string, string> = {};
export const uwuEndings = [":3"] as const;

export const executeMessages = ["gay"] as const;
export const executeEmojis = [
	["🩷"],
	["❤️"],
	["🧡"],
	["💛"],
	["💚"],
	["🩵"],
	["💙"],
	["💜"],
] as const;
