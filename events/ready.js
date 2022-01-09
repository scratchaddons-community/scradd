import { Collection } from "discord.js";
import commands from "../lib/commands.js";

/** @param {import("discord.js").Client<boolean>} client */
export default async (client) => {
	if (!client.application) return;
	console.log(
		`Connected to Discord with ID ${client.application.id} and tag ${client.user?.tag}`,
	);
	const prexistingCommands = await client.application.commands.fetch({
		guildId: process.env.GUILD_ID || "",
	});

	/**
	 * @type {Collection<
	 * 	string,
	 * 	| import("@discordjs/builders").SlashCommandBuilder
	 * 	| import("@discordjs/builders").SlashCommandSubcommandsOnlyBuilder
	 * >}
	 */
	const slashes = new Collection();
	commands.forEach((command, key) => slashes.set(key, command.data));
	for (const [name, command] of prexistingCommands) {
		if (slashes.has(name)) return;
		return command.delete();
	}

	for (const [name, command] of slashes) {
		if (prexistingCommands.has(name)) {
			client.application?.commands.edit(
				command.name,
				command.toJSON(),
				process.env.GUILD_ID || "",
			);
		}
		client.application?.commands.create(command.toJSON(), process.env.GUILD_ID || "");
	}
};
