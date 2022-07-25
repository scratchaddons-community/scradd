import { Collection } from "discord.js";
import commands from "../lib/commands.js";
import pkg from "../lib/package.js";

/** @type {import("../types/event").default<"ready">} */
const event = {
	async event(client) {
		console.log(
			`Connected to Discord with tag ${client.user.tag ?? ""} on version ${pkg.version}`,
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

				return await channel?.send(`Bot restarted on version **v${pkg.version}**!`);
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
		/** @type {Collection<string, import("../types/command").Command>} */
		const slashes = new Collection();

		for (const [key, command] of commands.entries()) {
			if (command.apply !== false) slashes.set(key, command.data);
		}

		await Promise.all(
			prexistingCommands.map((command) => {
				if (slashes.has(command.name)) return false;

				return command.delete();
			}),
		);

		await Promise.all(
			slashes.map(
				async (command, name) =>
					await (prexistingCommands.has(name)
						? client.application?.commands.edit(name, command.toJSON(), GUILD_ID)
						: client.application?.commands.create(command.toJSON(), GUILD_ID)),
			),
		);
	},

	once: true,
};

export default event;
