import { Util, Formatters } from "discord.js";

/**
 * Escape text.
 *
 * @param {string} text - The text to escape.
 *
 * @returns {string} The escaped text.
 */
export function escapeMessage(text) {
	return escapeLinks(Util.escapeMarkdown(text));
}
/**
 * Escape text for use inside inline code strings.
 *
 * @param {string} text - The text to escape.
 *
 * @returns {string} The escaped text.
 */
export function replaceBackticks(text) {
	return text.replaceAll("`", "'");
}

/**
 * Escape text for use in a link’s display or in a message sent by a webhook.
 *
 * @param {string} text - The text to escape.
 *
 * @returns {string} The escaped text.
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
 * @file Generate A tooltip.
 *
 * @param {{ guild: null | { id: string }; channel: null | { id: string } }} interaction - Interaction or message.
 * @param {string} display - The displayed text.
 * @param {string | undefined} tooltipText - The tooltip text.
 *
 * @returns {string} - The link.
 */
export function generateTooltip(interaction, display, tooltipText) {
	return tooltipText
		? Formatters.hyperlink(
				escapeLinks(display),
				`https://discord.com/channels/${interaction.guild?.id ?? "@me"}/${
					interaction.channel?.id ?? ""
				}`,
				tooltipText,
		  )
		: escapeLinks(display);
}
