import type { ColorResolvable } from "discord.js";

import twemojiRegexp from "@twemoji/parser/dist/lib/regex.js";
import { Colors, FormattingPatterns } from "discord.js";

import config from "../../common/config.ts";
import { camelToLowerSentence } from "../../util/text.ts";

export const CUSTOM_ROLE_PREFIX = "✨ ";

const validContentTypes = ["image/jpeg", "image/png", "image/apng", "image/gif", "image/webp"];
/**
 * Valid strings:
 *
 * - String matching `twemojiRegexp`.
 * - Snowflake of existing server emoji.
 * - `data:` URI.
 * - String starting with `https://`
 */
export async function resolveIcon(
	icon: string,
): Promise<
	{ icon: string; unicodeEmoji: null } | { unicodeEmoji: string; icon: null } | undefined
> {
	const twemoji = icon.match(twemojiRegexp.default);
	if (twemoji?.[0] === icon) return { unicodeEmoji: icon, icon: null };

	const customEmoji = FormattingPatterns.Emoji.exec(icon);
	const id =
		(customEmoji?.[0] === icon && customEmoji.groups?.id) || (/^\d{17,20}$/.test(icon) && icon);
	const url = id && config.guild.emojis.resolve(id)?.url;
	if (url) return { icon: url, unicodeEmoji: null };

	if (validContentTypes.some((contentType) => icon.startsWith(`data:${contentType};`)))
		return { icon, unicodeEmoji: null };

	if (!/^https?:\/\//.test(icon) || !URL.canParse(icon)) return;

	const response = await fetch(icon, { method: "HEAD" });
	if (!response.ok) return;

	const contentLength = +(response.headers.get("Content-Length") ?? Infinity);
	if (contentLength > 256_000) return;

	const contentType = response.headers.get("Content-Type");
	if (!contentType || !validContentTypes.includes(contentType)) return;

	return { icon, unicodeEmoji: null };
}

export const COLORS = Object.fromEntries(
	([...Object.keys(Colors), "Random"] as const).flatMap((color) => [
		[color.toLowerCase(), color],
		[camelToLowerSentence(color), color],
	]),
);
export function parseColor(
	rawColor: string | undefined,
): Extract<ColorResolvable, string> | undefined {
	if (!rawColor) return undefined;

	const color = rawColor.toLowerCase();

	const preset = Object.keys(COLORS).includes(color) && COLORS[color];
	if (preset) return preset;

	const hex = color.startsWith("#") ? color : (`#${color}` as const);
	if (!/^#(?:[\da-f]{6}|[\da-f]{3})$/i.test(hex)) return undefined;

	return hex.length === 4 ?
			`#${hex[1] ?? ""}${hex.slice(1, 3)}${hex.slice(2, 4)}${hex[3] ?? ""}`
		:	hex;
}
