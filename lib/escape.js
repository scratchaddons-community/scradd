/**
 * Escape text.
 *
 * @param {string} text - The text to escape.
 *
 * @returns {string} The escaped text.
 */
export default function escape(text) {
	return escapeForLinkOrWebhook(
		escapeForInlineCode(text.replaceAll(/(>|\\|\*|_|~|\|\|)/g, "\\$1")),
	);
}
/**
 * Escape text for use inside inline code strings.
 *
 * @param {string} text - The text to escape.
 *
 * @returns {string} The escaped text.
 */
export function escapeForInlineCode(text) {
	return text.replaceAll("`", "'");
}
/**
 * Escape text for use inside code blocks.
 *
 * @param {string} text - The text to escape.
 *
 * @returns {string} The escaped text.
 */
export function escapeForCodeblock(text) {
	return text.replaceAll("```", "'''");
}

/**
 * Escape text for use in a link's display or in a message sent by a webhook.
 *
 * @param {string} text - The text to escape.
 *
 * @returns {string} The escaped text.
 */
export function escapeForLinkOrWebhook(text) {
	while (text.split("[").length > text.split("]").length) {
		text = text.replace("[", "");
	}
	return text.replaceAll(/(\])/g, "\\]");
}
