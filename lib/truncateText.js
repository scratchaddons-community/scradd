/**
 * @param {string} text
 * @param {number} maxLength
 *
 * @returns {string}
 */
export default function truncateText(text, maxLength) {
	return text.length < maxLength ? text : text.substring(0, maxLength - 1) + "…";
}
