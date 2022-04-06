import { strip } from "./escape.js";

/**
 * Slice a string so that it fits into a given length.
 *
 * @file Truncate A string.
 *
 * @param {string} text - The string to truncate.
 * @param {number} maxLength - The maximum length of the string.
 *
 * @returns {string} - The truncated string.
 */
export default function truncateText(text, maxLength) {
	const firstLine = strip(text).split("\n")[0] ?? "";

	return firstLine.length > maxLength
		? `${firstLine.slice(0, Math.max(0, maxLength - 1))}…`
		: firstLine;
}
