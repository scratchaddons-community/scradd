/** @file Initialize Bot on ready. Register commands and etc. */

import { Collection } from "discord.js";
import { Embed } from "@discordjs/builders";

import commands from "../common/commands.js";
import { pkg } from "../lib/files.js";

/** @type {import("../types/event").default<"ready">} */
const event = {
	async event(client) {
		console.log(
			`Connected to Discord with ID ${client.application.id} and tag ${
				client.user.tag ?? ""
			}`,
		);

		const GUILD_ID = process.env.GUILD_ID ?? "";
		const guilds = await client.guilds.fetch();

		guilds.forEach(async (guild) => {
			if (guild.id === GUILD_ID) {
				if (process.env.NODE_ENV !== "production") return;

				const { channels } = await guild.fetch();
				const { LOG_CHANNEL } = process.env;

				if (!LOG_CHANNEL) throw new ReferenceError("LOG_CHANNEL is not set in the .env");

				const channel = await channels.fetch(LOG_CHANNEL);

				if (!channel?.isText())
					throw new ReferenceError("Could not find error reporting channel");

				await channel?.send({
					embeds: [
						new Embed()
							.setTitle("Bot restarted!")
							.setDescription(`Version **v${pkg.version}**`)
							.setColor(Math.floor(Math.random() * (0xffffff + 1))),
					],
				});
			} else {
				client.application.commands.set([], guild.id).catch(() => {});
			}
		});

		const [dmCommands, serverCommands] = (await commands(client)).toJSON().reduce(
			([dmCommands, serverCommands], command) => {
				if (!(command.apply ?? true)) return [dmCommands, serverCommands];
				if (command.dm && process.env.NODE_ENV === "production")
					dmCommands.push(command.data.toJSON());
				else serverCommands.push(command.data.toJSON());
				return [dmCommands, serverCommands];
			},
			/**
			 * @type {[
			 * 	import("discord-api-types").RESTPostAPIApplicationCommandsJSONBody[],
			 * 	import("discord-api-types").RESTPostAPIApplicationCommandsJSONBody[],
			 * ]}
			 */ ([[], []]),
		);

		await Promise.all([
			client.application.commands.set(dmCommands),
			client.application.commands.set(serverCommands, GUILD_ID),
		]);
	},

	once: true,
};

export default event;
