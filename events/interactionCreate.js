import commands from "../lib/commands.js";

/** @param {import("discord.js").Interaction<import("discord.js").CacheType>} interaction */
export default async function execute(interaction) {
	if (!interaction.isCommand()) return;

	const command = commands.get(interaction.commandName);
	if (!command) interaction.reply({content: "You somehow used a non-existent command... 🤔",ephemeral: true});

	return command.interaction(interaction);
}
