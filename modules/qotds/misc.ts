import twemojiRegexp from "@twemoji/parser/dist/lib/regex.js";

import { BOARD_EMOJI } from "../board/misc.js";

export const DEFAULT_SHAPES = [
	"🔺",
	"♦️",
	"⭕",
	"🔶",
	"💛",
	"🟩",
	"💠",
	"🔹",
	"🟣",
	"🏴",
	"❕",
	"◽",
];
export const bannedReactions = new Set([BOARD_EMOJI]);

export function parseOptions(rawOptions: string): { reactions: string[]; options: string[] } {
	if (rawOptions === "") return { reactions: [], options: [] };
	const { customReactions, options } = rawOptions
		.split(/\s*\n\s*/g)
		.reduce<{ customReactions: (string | undefined)[]; options: string[] }>(
			({ customReactions, options }, option) => {
				const match = option.match(twemojiRegexp.default);
				const emoji = match && option.startsWith(match[0]) && match[0];
				return {
					options: [...options, (emoji ? option.replace(emoji, "") : option).trim()],
					customReactions: [
						...customReactions,
						!emoji || bannedReactions.has(emoji) ? undefined : emoji,
					],
				};
			},
			{ customReactions: [], options: [] },
		);
	const shapes = DEFAULT_SHAPES.filter((emoji) => !customReactions.includes(emoji));

	const reactions = customReactions.map((emoji) => emoji ?? shapes.shift() ?? "");
	return { reactions: reactions.length > 20 || reactions.includes("") ? [] : reactions, options };
}
