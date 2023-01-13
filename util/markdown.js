import { escapeMarkdown, hyperlink } from "discord.js";

/**
 * Escape text for use in a link’s display or in a message sent by a webhook.
 *
 * @deprecated Djs has this. Does the first line need to be backported?
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
 * Escape text.
 *
 * @deprecated Djs has this.
 *
 * @param {string} text - The text to escape.
 *
 * @returns {string} The escaped text.
 */
export function escapeMessage(text) {
	return escapeMarkdown(text, { maskedLink: true });
}

/**
 * Strip all markdown from a string.
 *
 * @param {string} text - String to strip.
 *
 * @returns {string} - Stripped string.
 */
export function stripMarkdown(text) {
	return text.replaceAll(
		/(?<!\\)\\|```\S*\s+(.+?)\s*```|(?<!\\)\*\*(.+?)(?<!\\)\*\*|(?<!\\)__(.+?)(?<!\\)__|(?<!\\\*?)\*(.+?)(?<!\\|\*)\*|(?<!\\_?)_(.+?)(?<!\\|_)_|~~(.+?)(?<!\\)~~|`(.+?)(?<!\\|`)`|^> (.+?)/gms,
		"$1$2$3$4$5$6$7$8",
	);
}

/**
 * Generate a Markdown tooltip.
 *
 * @param {import("discord.js").TextBasedChannel} channel - The channel the tooltip will be sent in.
 * @param {string} display - The displayed text.
 * @param {string | undefined} tooltipText - The tooltip text.
 *
 * @returns {string} - The link.
 *
 * @todo Just use escapeMaskedLink (waiting on https://github.com/discordjs/discord.js/pull/8944)
 */
export function generateTooltip(channel, display, tooltipText) {
	return tooltipText
		? hyperlink(
				escapeMarkdown(display, {
					codeBlock: false,
					inlineCode: false,
					bold: false,
					italic: false,
					underline: false,
					strikethrough: false,
					spoiler: false,
					codeBlockContent: false,
					inlineCodeContent: false,
					escape: false,
					maskedLink: true,
				}),
				channel?.url || "",
				tooltipText,
		  )
		: escapeMarkdown(display, {
				codeBlock: false,
				inlineCode: false,
				bold: false,
				italic: false,
				underline: false,
				strikethrough: false,
				spoiler: false,
				codeBlockContent: false,
				inlineCodeContent: false,
				escape: false,
				maskedLink: true,
		  });
}
