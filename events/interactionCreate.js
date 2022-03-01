/** @file Runs Commands when used. */
import commands from "../lib/commands.js";

/** @type {import("../types/event").default<"interactionCreate">} */
const event = {
	async event(interaction) {
		if (!interaction.isCommand()) return;

		const command = commands.get(interaction.commandName);

		if (!command) throw new ReferenceError(`Command \`${interaction.commandName}\` not found.`);

		await command.interaction(interaction);
	},
};
export default event;
