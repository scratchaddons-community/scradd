import commands from "../lib/commands.js";

/** @param {import("discord.js").Interaction} interaction */
export default async function execute(interaction) {
	if (!interaction.isCommand()) return;

	const command = commands.get(interaction.commandName);
	if (!command) throw new Error("Command '" + interaction.commandName + "' not found.");

	return command.interaction(interaction);
}
