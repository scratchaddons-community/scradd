import { escapeLinks } from "./escape.js";

/**
 * Generate a Markdown link to the current channel with a tooltip.
 *
 * @file Generate A tooltip.
 *
 * @param {| import("discord.js").Interaction
 * 	| import("discord.js").Message
 * 	| { guild: { id: string }; channel: { id: string } }} interaction
 *   - Interaction or message.
 *
 * @param {string} display - The displayed text.
 * @param {string} tooltipText - The tooltip text.
 *
 * @returns {string} - The link.
 */
export default function generateTooltip(interaction, display, tooltipText) {
	return `[${escapeLinks(display)}](<https://discord.com/channels/${
		interaction.guild?.id ?? "@me"
	}/${interaction.channel?.id ?? ""}> "${tooltipText}")`;
}
