/** @file Initialize Bot on ready. Register commands and etc. */

import { Collection } from "discord.js";
import { Embed } from "@discordjs/builders";

import commands from "../lib/commands.js";
import pkg from "../lib/package.js";

/** @type {import("../types/event").default<"ready">} */
const event = {
	async event(client) {
		console.log(
			`Connected to Discord with ID ${client.application.id} and tag ${
				client.user?.tag ?? ""
			}`,
		);

		const GUILD_ID = process.env.GUILD_ID ?? "";
		const guilds = await client.guilds.fetch();

		guilds.forEach(async (guild) => {
			if (guild.id === GUILD_ID) {
				if (process.env.NODE_ENV !== "production") return;

				const { channels } = await guild.fetch();
				const { LOGS_CHANNEL } = process.env;

				if (!LOGS_CHANNEL) throw new ReferenceError("LOGS_CHANNEL is not set in the .env");

				const channel = await channels.fetch(LOGS_CHANNEL);

				if (!channel?.isText())
					throw new ReferenceError("Could not find error reporting channel");

				return await channel?.send({
					embeds: [
						new Embed()
							.setTitle("Bot restarted!")
							.setDescription(`Version **v${pkg.version}**`)
							.setColor(Math.floor(Math.random() * (0xffffff + 1))),
					],
				});
			}

			const guildCommands = await client.application?.commands
				.fetch({ guildId: guild.id })
				.catch(() => {});
			guildCommands?.forEach(async (command) => await command.delete());
		});

		const prexistingCommands = await client.application.commands.fetch({ guildId: GUILD_ID });

		const prexistingDmCommands = await client.application.commands.fetch();

		/** @type {Collection<string, import("../types/command").default>} */
		const slashes = new Collection();

		for (const [key, command] of commands.entries()) {
			if (command.apply !== false) slashes.set(key, command);
		}

		await Promise.all([
			...prexistingCommands.map((command) => {
				if (
					slashes.has(command.name) ||
					(slashes.get(command.name)?.permissions !== "DM" &&
						process.env.NODE_ENV === "production")
				)
					return;

				return command.delete();
			}),
			prexistingDmCommands.map((command) => {
				if (
					slashes.has(command.name) ||
					(slashes.get(command.name)?.permissions === "DM" &&
						process.env.NODE_ENV === "production")
				)
					return;

				return command.delete();
			}),
		]);

		await Promise.all(
			slashes.map(async ({ data: command, permissions }, name) => {
				const newCommand = await (prexistingCommands.has(name)
					? permissions === "DM" && process.env.NODE_ENV === "production"
						? client.application?.commands.edit(name, command.toJSON())
						: client.application?.commands.edit(name, command.toJSON(), GUILD_ID)
					: client.application?.commands.create(
							command.toJSON(),
							permissions === "DM" && process.env.NODE_ENV === "production"
								? undefined
								: GUILD_ID,
					  ));

				if (permissions && permissions !== "DM")
					await newCommand?.permissions.add({ guild: GUILD_ID, permissions });
			}),
		);
	},

	once: true,
};

export default event;
