/**
 * @param {string} text
 * @param {number} maxLength
 *
 * @returns {string}
 */
export default function truncateText(text, maxLength) {
	const firstLine =
		text
			.replace(
				/```(?:[^\s]+)?\s*(.+?)\s*```|(?<!\\)\*\*(.+?)(?<!\\)\*\*|(?<!\\)__(.+?)(?<!\\)__|(?<!\\\*?)\*(.+?)(?<!\\|\*)\*|(?<!\\_?)_(.+?)(?<!\\|_)_|~~(.+?)(?<!\\)~~|`(.+?)(?<!\\|`)`|^> (.+?)/gms,
				"$1$2$3$4$5$6$7$8",
			)
			.split("\n")[0] || "";
	return firstLine.length < maxLength ? firstLine : firstLine.substring(0, maxLength - 1) + "…";
}
