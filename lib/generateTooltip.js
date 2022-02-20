import {escapeForLink} from "./escape.js";

/**
 * Generate a Markdown link to the current channel with a tooltip.
 *
 * @file Generate A tooltip.
 *
 * @param {| import("discord.js").Interaction
 * 	| import("discord.js").Message
 * 	| { guildId: string; channelId: string }} interaction
 *   - Interaction or message.
 *
 * @param {string} display - The displayed text.
 * @param {string} tooltipText - The tooltip text.
 *
 * @returns {string} - The link.
 */
export default function generateTooltip(interaction, display, tooltipText) {
	return `[${escapeForLink(display)}](https://discord.com/channels/${interaction.guildId || ""}/${
		interaction.channelId || ""
	} "${tooltipText}")`;
}
