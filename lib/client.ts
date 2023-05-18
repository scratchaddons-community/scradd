import {
	Awaitable,
	Client,
	GatewayIntentBits,
	Partials,
	Snowflake,
	BaseInteraction,
} from "discord.js";
import pkg from "../package.json" assert { type: "json" };
import path from "node:path";
import url from "node:url";
import fileSystem from "node:fs/promises";
import defineEvent, { ClientEvent, Event, getEvents } from "./events.js";
import { commandData, commands } from "./commands.js";
import { buttons, modals, selects } from "./components.js";
import { AssertionError } from "node:assert";
import { sanitizePath } from "../util/files.js";

export let client: Client<true> = undefined as any;

export default async function login(options: {
	handleError: (error: any, event: string) => Awaitable<void>;
	intents: GatewayIntentBits[];
	modulesDir: string;
	commandsGuildId?: Snowflake;
	productionId?: Snowflake;
	commandErrorMessage: string;
}) {
	const Handler = new Client({
		allowedMentions: { parse: ["users"], repliedUser: true },
		intents: options.intents,
		failIfNotExists: false,
		partials: [
			Partials.User,
			Partials.Channel,
			Partials.GuildMember,
			Partials.Message,
			Partials.Reaction,
			Partials.GuildScheduledEvent,
			Partials.ThreadMember,
		],
		ws: { large_threshold: 0 },
		presence: { status: "dnd" },
	});

	const readyPromise = new Promise<Client<true>>((resolve) => Handler.once("ready", resolve));
	Handler.on("debug", (message) => {
		if (
			process.env.NODE_ENV !== "production" ||
			!(message.includes("Sending a heartbeat") || message.includes("Heartbeat acknowledged"))
		)
			console.debug(message);
	})
		.on("warn", (warning) => options.handleError(warning, "warn"))
		.on("error", (error) => options.handleError(error, "error"))
		.on("invalidated", async () => {
			console.error(new ReferenceError("Session is invalid"));
			process.exit(1);
		})
		.on("guildUnavailable", async (guild) =>
			options.handleError(
				new ReferenceError(`Guild ${guild.name} (${guild.id}) unavailable`),
				"guildUnavailable",
			),
		)
		.rest.on("invalidRequestWarning", (data) =>
			options.handleError(
				`${data.count} requests; ${data.remainingTime}ms left`,
				"invalidRequestWarning",
			),
		)
		.on("restDebug", (message) => {
			if (
				process.env.NODE_ENV !== "production" ||
				!message.includes("Received bucket hash update")
			)
				console.debug(message);
		});

	await Handler.login(process.env.BOT_TOKEN);
	client = await readyPromise;

	console.log(`Connected to Discord with tag ${client.user.tag ?? ""} on version ${pkg.version}`);

	if (client.user.id === options.productionId && !process.argv.includes("--production")) {
		throw new AssertionError({
			actual: process.argv.map((argument) => sanitizePath(argument)),
			expected: "--production",
			operator: ".includes",
			message: "Refusing to run on prod without --production flag",
		});
	}

	const directory = options.modulesDir;
	const modules = await fileSystem.readdir(directory);

	const promises = modules.map(async (module) => {
		const fullPath = path.join(directory, module);
		const resolved = (await fileSystem.lstat(fullPath)).isDirectory()
			? path.join(fullPath, "./index.js")
			: fullPath;
		if (path.extname(resolved) !== ".js") return;

		await import(url.pathToFileURL(path.resolve(directory, resolved)).toString());
	});
	await Promise.all(promises);

	defineEvent("interactionCreate", async (interaction) => {
		if (interaction.isAutocomplete()) {
			if (!interaction.inGuild()) throw new TypeError("Used command in DM");
			const command = commands.get(interaction.command?.name ?? "");

			const { autocomplete } =
				command?.options?.[interaction.options.getFocused(true).name] ?? {};

			if (!autocomplete) {
				throw new ReferenceError(
					`Command \`${interaction.command?.name}\` autocomplete handler not found`,
				);
			}

			return autocomplete(interaction);
		}

		if (!interaction.isCommand()) {
			const [id, name] = interaction.customId.split(/(?<=^[^_]*)_/);
			if (!name) return;

			if (interaction.isButton()) await buttons[name]?.(interaction, id ?? "");
			else if (interaction.isModalSubmit()) await modals[name]?.(interaction, id ?? "");
			else if (interaction.isAnySelectMenu()) await selects[name]?.(interaction, id ?? "");

			return;
		}
		if (!interaction.inGuild()) throw new TypeError("Used command in DM");

		const command = commands.get(interaction.command?.name ?? "");

		if (!command)
			throw new ReferenceError(`Command \`${interaction.command?.name}\` not found`);

		// @ts-expect-error TS2345 -- No concrete fix to this
		await command.command(interaction);
	});

	for (const [event, execute] of Object.entries(getEvents()) as [ClientEvent, Event][]) {
		client.on(event, async (...args) => {
			try {
				await execute(...args);
			} catch (error) {
				const interaction =
					args[0] instanceof BaseInteraction && !args[0].isAutocomplete()
						? args[0]
						: undefined;
				await options.handleError(
					error,
					interaction
						? interaction.isChatInputCommand()
							? interaction.toString()
							: interaction.isCommand()
							? `/${interaction.command?.name}`
							: `${interaction.constructor.name}: ${interaction.customId}`
						: event,
				);

				if (interaction?.deferred || interaction?.replied) {
					await interaction.followUp({
						ephemeral: true,
						content: options.commandErrorMessage,
					});
				} else if (Number(interaction?.createdAt) - Date.now() < 3000) {
					await interaction?.reply({
						ephemeral: true,
						content: options.commandErrorMessage,
					});
				}
			}
		});
	}

	if (options.commandsGuildId)
		await client.application.commands.set(commandData, options.commandsGuildId);
	else await client.application.commands.set(commandData);

	await client.guilds.fetch().then(
		async (guilds) =>
			await Promise.all(
				guilds.map(async (otherGuild) => {
					if (otherGuild.id !== options.commandsGuildId)
						await client.application.commands.set([], otherGuild.id).catch(() => {});
				}),
			),
	);
}
