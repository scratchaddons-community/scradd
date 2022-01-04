import commands from "../lib/commands.js";

/** @param {import("discord.js").Interaction<import("discord.js").CacheType>} interaction */
export default async function execute(interaction) {
	if (!interaction.isCommand() || !interaction.guild === null) return;

	const command = commands.get(interaction.commandName);
	if (!command) return;

	return command.interaction(interaction);
}
