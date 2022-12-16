import { escapeMarkdown, hyperlink } from "discord.js";

/**
 * Escape text.
 *
 * @param {string} text - The text to escape.
 *
 * @returns {string} The escaped text.
 */
export function escapeMessage(text) {
	return escapeLinks(escapeMarkdown(text));
}

/**
 * Escape text for use in a link’s display or in a message sent by a webhook.
 *
 * @param {string} text - The text to escape.
 *
 * @returns {string} The escaped text.
 * @todo djs has this
 */
export function escapeLinks(text) {
	while (text.split("[").length > text.split("]").length) text = text.replace("[", "");

	return text.replaceAll(/\[/g, "\\[");
}

/**
 * @param {string} text
 *
 * @returns
 */
export function stripMarkdown(text) {
	return text.replaceAll(
		/(?<!\\)\\|```\S*\s+(.+?)\s*```|(?<!\\)\*\*(.+?)(?<!\\)\*\*|(?<!\\)__(.+?)(?<!\\)__|(?<!\\\*?)\*(.+?)(?<!\\|\*)\*|(?<!\\_?)_(.+?)(?<!\\|_)_|~~(.+?)(?<!\\)~~|`(.+?)(?<!\\|`)`|^> (.+?)/gms,
		"$1$2$3$4$5$6$7$8",
	);
}

/**
 * Generate a Markdown link to the current channel with a tooltip.
 *
 * @param {import("discord.js").TextBasedChannel} channel
 * @param {string} display - The displayed text.
 * @param {string | undefined} tooltipText - The tooltip text.
 *
 * @returns {string} - The link.
 */
export function generateTooltip(channel, display, tooltipText) {
	return tooltipText
		? hyperlink(escapeLinks(display), channel?.url || "", tooltipText)
		: escapeLinks(display);
}
