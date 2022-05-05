/** @file Initialize Bot on ready. Register commands and etc. */

import log from "../common/moderation/logging.js";

import commands from "../common/commands.js";
import { pkg } from "../lib/files.js";

/** @type {import("../types/event").default<"ready">} */
const event = {
	async event() {
		console.log(
			`Connected to Discord with ID ${this.application.id} and tag ${this.user.tag ?? ""}`,
		);

		const GUILD_ID = process.env.GUILD_ID ?? "";
		const guilds = await this.guilds.fetch();

		guilds.forEach(
			async (guild) =>
				await (guild.id === GUILD_ID
					? log(
							await guild.fetch(),
							`Bot restarted! Version **v${pkg.version}**`,
							"server",
					  )
					: this.application.commands.set([], guild.id).catch(() => {})),
		);

		const [dmCommands, serverCommands] = (await commands(this)).toJSON().reduce(
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
			this.application.commands.set(dmCommands),
			this.application.commands.set(serverCommands, GUILD_ID),
		]);
	},

	once: true,
};

export default event;
