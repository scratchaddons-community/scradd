import log from "../common/moderation/logging.js";
import { pkg, importScripts } from "../lib/files.js";
import CONSTANTS from "../common/CONSTANTS.js";
import logError from "../lib/logError.js";
import { ActivityType } from "discord.js";
import { AssertionError } from "assert";
import path from "path";
import url from "url";

/** @type {import("../types/event").default<"ready">} */
const event = {
	async event() {
		console.log(
			`Connected to Discord with tag ${this.user.tag ?? ""} on version ${pkg.version}`,
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
					type: ActivityType.Watching,
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

			if (guild.id !== GUILD_ID)
				await this.application.commands.set([], guild.id).catch(() => {});
		});

		const dirname = path.dirname(url.fileURLToPath(import.meta.url));

		const commands =
			await /** @type {Promise<import("discord.js").Collection<string, import("../types/command").default>>} */ (
				importScripts(path.resolve(dirname, "../commands"))
			);

		const [dmCommands, serverCommands] = await commands.reduce(
			async (promise, command, name) => {
				const [dmCommands, serverCommands] = await promise;
				if (!(command.enable ?? true)) return [dmCommands, serverCommands];

				const data =
					typeof command.data === "function"
						? await command.data.call(this)
						: command.data;
				if (data.name)
					throw new AssertionError({
						actual: data.name,
						expected: "",
						operator: name,
						message: "Don’t manually set the command name, it will use the file name",
					});

				data.setName(name);

				const json = data.toJSON();

				if (typeof json.dm_permission !== "undefined")
					throw new AssertionError({
						actual: json.dm_permission,
						expected: undefined,
						message: "Don’t set DM permissions, set `dm: true` instead",
					});

				(command.dm && process.env.NODE_ENV === "production"
					? dmCommands
					: serverCommands
				).push(json);

				return [dmCommands, serverCommands];
			},
			/**
			 * @type {import("discord.js").Awaitable<
			 * 	[
			 * 		import("discord.js").RESTPostAPIApplicationCommandsJSONBody[],
			 * 		import("discord.js").RESTPostAPIApplicationCommandsJSONBody[],
			 * 	]
			 * >}
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
