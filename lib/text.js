import { stripMarkdown } from "./markdown.js";
/**
 * Generate a short, random string based off the date. Note that the length is not fixed.
 *
 * Intended for use with message components `customId`s.
 *
 * @file Generate Short string guaranteed to never be the same from call to call.
 *
 * @param {string} [prefix] - An optional prefix to the hash.
 *
 * @returns {string} Hash.
 */
export function generateHash(prefix = "") {
	return `${prefix}.${Math.round(
		Math.random() * 100_000_000 + Date.now() - 1_643_000_000_000,
	).toString(36)}`;
}

/**
 * @file Join An array with commas and the word "and".
 *
 * @template T
 *
 * @param {T[]} array
 * @param {(item: T) => string} [callback]
 */
export function joinWithAnd(array, callback = (item) => `${item}`) {
	const last = array.pop();

	if (typeof last === "undefined") return "";

	if (array.length === 0) return callback(last);

	return `${
		array.length === 1
			? (array[0] ? callback(array[0]) : "") + " "
			: array.map((item) => `${callback(item)}, `).join("")
	}and ${callback(last)}`;
}

/**
 * @param {string} unclean
 *
 * @returns {string}
 */
export function sanitizePath(unclean, noDoxx = true) {
	const sanitized = decodeURIComponent(unclean)
		.replaceAll("\\", "/")

		.replaceAll("file:///", "");
	return noDoxx ? sanitized.replaceAll(sanitizePath(process.cwd(), false), ".") : sanitized;
}

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
export function truncateText(text, maxLength) {
	const firstLine = stripMarkdown(text).split("\n")[0] ?? "";

	return firstLine.length > maxLength
		? `${firstLine.slice(0, Math.max(0, maxLength - 1))}…`
		: firstLine;
}

/** @param {string} text */
export function caesar(text, rot = 13) {
	return text.replace(/[a-zA-Z]/g, function (chr) {
		var start = chr <= "Z" ? 65 : 97;
		return String.fromCharCode(start + ((chr.charCodeAt(0) - start + rot) % 26));
	});
}
