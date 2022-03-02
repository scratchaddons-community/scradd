/** @file Initialize Bot on ready. Register commands and etc. */

import fileSystem from "fs/promises";
import path from "path";
import url from "url";

import { Collection, MessageEmbed } from "discord.js";

import commands from "../lib/commands.js";

const pkg = JSON.parse(
	await fileSystem.readFile(
		path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "../package.json"),
		"utf8",
	),
);

/** @type {import("../types/event").default<"ready">} */
const event = {
	async event(client) {
		console.log(
			`Connected to Discord with ID ${client.application.id} and tag ${
				client.user?.tag || ""
			}`,
		);

		const GUILD_ID = process.env.GUILD_ID || "";
		const guilds = await client.guilds.fetch();

		guilds.forEach(async (guild) => {
			if (guild.id === GUILD_ID) {
				if (process.env.NODE_ENV !== "production") return;

				const { channels } = await guild.fetch();
				const { ERROR_CHANNEL } = process.env;

				if (!ERROR_CHANNEL)
					throw new ReferenceError("ERROR_CHANNEL is not set in the .env");

				const channel = await channels.fetch(ERROR_CHANNEL);

				if (!channel?.isText())
					throw new ReferenceError("Could not find error reporting channel");

				return await channel?.send({
					embeds: [
						new MessageEmbed()
							.setTitle("Bot restarted!")
							.setDescription(`Version ${pkg.version}`)
							.setColor("RANDOM"),
					],
				});
			}

			const guildCommands = await client.application?.commands
				.fetch({
					guildId: guild.id,
				})
				.catch(() => {});

			guildCommands?.forEach(async (command) => await command.delete().catch(() => {}));
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
