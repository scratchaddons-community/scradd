import { stripMarkdown } from "./markdown.js";

/** @typedef {import("discord.js").ButtonBuilder | import("discord.js").SelectMenuBuilder | import("discord.js").TextInputBuilder} ComponentBuilder */

/**
 * Generate a short, random string based off the date. Note that the length is not fixed.
 *
 * Intended for use on {@link ComponentBuilder.setCustomId}s.
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
 * @template {{ toString(): string }} T
 *
 * @param {T[]} array
 * @param {(item: T) => string} [callback]
 */
export function joinWithAnd(array, callback = (item) => item.toString()) {
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
 * Slice a string so that it fits into a given length.
 *
 * @param {string} text - The string to truncate.
 * @param {number} maxLength - The maximum length of the string.
 *
 * @returns {string} - The truncated string.
 */
export function truncateText(text, maxLength) {
	const firstLine = stripMarkdown(text).split("\n")[0] ?? "";

	return firstLine.length > maxLength || !text.includes("\n")
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

/** @param {string} text */
export function pingablify(text) {
	const getRegex = () => /[^\w`~!@#$%^&*()=+[\]\\{}|;':",\./<>? ]/gi;
	const pingable =
		[...text].reduce((count, current) => {
			return count + +!!getRegex().exec(current);
		}, 0) <
		text.length / 2;

	return pingable ? text : text.replaceAll(getRegex(), "") || "[pingable name]";
}

/** @param {string} text */
export function normalize(text) {
	return text
		.toLowerCase()
		.normalize("NFD")
		.replace(
			/[\p{Diacritic}\u00AD\u034F\u061C\u070F\u17B4\u17B5\u180E\u200A-\u200F\u2060-\u2064\u206A-\u206F𝅳�\uFEFF\uFFA0]/gu,
			"",
		);
}
