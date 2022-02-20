/** @file Runs Commands when used. */
import commands from "../lib/commands.js";

/**
 * Run command.
 *
 * @param {import("discord.js").Interaction} interaction - Interaction.
 */
export default async function execute(interaction) {
	if (!interaction.isCommand()) return;

	const command = commands.get(interaction.commandName);

	if (!command) throw new Error(`Command '${interaction.commandName}' not found.`);

	await command.interaction(interaction);
}
