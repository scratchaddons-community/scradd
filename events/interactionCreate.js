import commands from "../lib/commands.js";

/** @param {import("discord.js").Interaction} interaction */
export default async function execute(interaction) {
	if (!interaction.isCommand()) return;

	const command = commands.get(interaction.commandName);
	if (!command)
		return interaction.reply({
			content: "You somehow used a non-existent command... 🤔",
			ephemeral: true,
		});

	return command.interaction(interaction);
}
