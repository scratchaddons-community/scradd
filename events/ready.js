/** @file Initialize Bot on ready.Register commands and set RPC. */
import { Collection } from "discord.js";

import commands from "../lib/commands.js";

/** @type {import("../types/event").default<"ready">} */
const event = {
	async event(client) {
		console.log(
			`Connected to Discord with ID ${client.application.id} and tag ${
				client.user?.tag || ""
			}`,
		);

		client.user?.setActivity(
			process.env.NODE_ENV === "production" ? "the SA server!" : "for bugs...",
			{ type: "WATCHING" },
		);

		const GUILD_ID = process.env.GUILD_ID || "";
		const guilds = await client.guilds.fetch();
		guilds.forEach(async (guild) => {
			if (guild.id === GUILD_ID) return;

			const commands = await client.application?.commands
				.fetch({
					guildId: guild.id,
				})
				.catch(() => {});
			commands?.forEach((command) => command.delete().catch(() => {}));
		});

		const prexistingCommands = await client.application.commands.fetch({
			guildId: GUILD_ID,
		});
		/**
		 * @type {Collection<
		 * 	string,
		 * 	{
		 * 		command: import("../types/command").Command;
		 * 		permissions?: import("discord.js").ApplicationCommandPermissionData[];
		 * 	}
		 * >}
		 */
		const slashes = new Collection();

		for (const [key, command] of commands.entries()) {
			if (command.apply !== false)
				slashes.set(key, { command: command.data, permissions: command.permissions });
		}

		await Promise.all(
			prexistingCommands.map((command) => {
				if (slashes.has(command.name)) return false;

				return command.delete();
			}),
		);

		await Promise.all(
			slashes.map(async ({ command, permissions }, name) => {
				const newCommand = await (prexistingCommands.has(name)
					? client.application?.commands.edit(name, command.toJSON(), GUILD_ID)
					: client.application?.commands.create(command.toJSON(), GUILD_ID));

				if (permissions)
					await newCommand?.permissions.add({ guild: GUILD_ID, permissions });
			}),
		);
	},
	once: true,
};
export default event;
