import commands from "../lib/commands.js";

/** @type {import("../types/event").default<"interactionCreate">} */
const event = {
	async event(interaction) {
		if (!interaction.isCommand()) return;
		try {
			const command = commands.get(interaction.commandName);

			if (!command)
				throw new ReferenceError(`Command \`${interaction.commandName}\` not found.`);
			await command.interaction(interaction);
		} catch (error) {
			await interaction[interaction.replied ? "editReply" : "reply"]({
				ephemeral: true,
				content: "An error occurred.",
				embeds: [],
				components: [],
				files: [],
			}).catch(console.log);
			throw error;
		}
	},
};

export default event;
