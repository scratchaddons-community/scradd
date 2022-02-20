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
	const firstLine =
		text
			.replace(
				/```(?:[^\s]+)?\s*(.+?)\s*```|(?<!\\)\*\*(.+?)(?<!\\)\*\*|(?<!\\)__(.+?)(?<!\\)__|(?<!\\\*?)\*(.+?)(?<!\\|\*)\*|(?<!\\_?)_(.+?)(?<!\\|_)_|~~(.+?)(?<!\\)~~|`(.+?)(?<!\\|`)`|^> (.+?)/gms,
				"$1$2$3$4$5$6$7$8",
			)
			.split("\n")[0] || "";
	return firstLine.length > maxLength ? `${firstLine.slice(0, Math.max(0, maxLength - 1))}…` : firstLine;
}
