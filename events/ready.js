/** @file Initialize Bot on ready. Register commands and etc. */

import log from "../common/moderation/logging.js";
import commands from "../common/commands.js";
import { pkg } from "../lib/files.js";
import CONSTANTS from "../common/CONSTANTS.js";
import logError from "../lib/logError.js";

/** @type {import("../types/event").default<"ready">} */
const event = {
	async event() {
		console.log(
			`Connected to Discord with tag ${this.user.tag ?? ""} on version v${pkg.version}`,
		);

		if (CONSTANTS.prodScradd === this.user.id && !process.argv.includes("--production")) {
			await logError(
				new OverconstrainedError(
					CONSTANTS.prodScradd,
					"Refusing to run on prod without --production flag",
				),
				"ready",
				this,
			);
			process.exit();
		}

		this.user.setPresence({
			activities: [
				{
					name:
						process.env.NODE_ENV === "production" ||
						CONSTANTS.prodScradd === this.user.id
							? "the SA server!"
							: "for bugs…",
					type: "WATCHING",
					url: pkg.homepage,
				},
			],
		});

		const GUILD_ID = process.env.GUILD_ID ?? "";
		const guilds = await this.guilds.fetch();

		guilds.forEach(async (guild) => {
			if (guild.id === GUILD_ID && process.env.NODE_ENV === "production") {
				await log(
					await guild.fetch(),
					`Bot restarted on version **v${pkg.version}**!`,
					"server",
				);
			}

			if (guild.id !== GUILD_ID) {
				await this.application.commands.set([], guild.id).catch(() => {});
			}
		});

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
