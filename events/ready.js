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
	 * 	Omit<
	 * 		import("@discordjs/builders").SlashCommandBuilder,
	 * 		"addSubcommand" | "addSubcommandGroup"
	 * 	>
	 * >}
	 */
	const slashes = new Collection();
	commands.forEach((command, key) => slashes.set(key, command.data));
	await Promise.all(
		prexistingCommands.map((command) => {
			if (slashes.has(command.name)) return;
			return command.delete();
		}),
	);

	await Promise.all(
		slashes.map((command) => {
			if (prexistingCommands.has(command.name))
				client.application?.commands.edit(
					command.name,
					command.toJSON(),
					process.env.GUILD_ID || "",
				);
			client.application?.commands.create(command.toJSON(), process.env.GUILD_ID || "");
		}),
	);
};
