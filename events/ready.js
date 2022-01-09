import { Collection } from "discord.js";
import commands from "../lib/commands.js";

/** @param {import("discord.js").Client<boolean>} client */
export default async (client) => {
	if (!client.application)
		throw new Error("`ready` was fired but `client.application` is undefined???");
	console.log(
		`Connected to Discord with ID ${client.application.id} and tag ${client.user?.tag}`,
	);
	const prexistingCommands = await client.application.commands.fetch({
		guildId: process.env.GUILD_ID || "",
	});
	/**
	 * @type {Collection<
	 * 	string,
	 * 	Omit<
	 * 		import("@discordjs/builders").SlashCommandBuilder,
	 * 		"addSubcommand" | "addSubcommandGroup"
	 * 	>
	 * >}
	 */
	const slashes = new Collection();
	commands.forEach((command, key) => slashes.set(key, command.data));
	for (const [, command] of prexistingCommands) {
		if (slashes.has(command.name)) continue;
		command.delete();
	}

	for (const [name, command] of slashes) {
		if (prexistingCommands.has(name)) {
			client.application?.commands.edit(name, command.toJSON(), process.env.GUILD_ID || "");
		} else {
			client.application?.commands.create(command.toJSON(), process.env.GUILD_ID || "");
		}
	}
};
