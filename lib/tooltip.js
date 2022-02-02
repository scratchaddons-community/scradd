/**
 * @param {	| import("discord.js").Interaction
 * 	| import("discord.js").Message
 * 	| { guildId: string; channelId: string }} interaction
 * @param {string} display
 * @param {string} tooltip
 *
 * @returns {string}
 */
export default function (interaction, display, tooltip) {
	return `[${display}](https://discord.com/channels/${interaction.guildId}/${interaction.channelId} "${tooltip}")`;
}
