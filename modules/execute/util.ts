import {
	ApplicationCommandType,
	Collection,
	GuildMember,
	type APIInteractionGuildMember,
	type ApplicationCommand,
	type ApplicationCommandOption,
	type Awaitable,
	type ChatInputCommandInteraction,
	type Guild,
	type TextBasedChannel,
	type User,
} from "discord.js";
import fileSystem from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { client } from "strife.js";
import { asyncFilter } from "../../util/promises.js";
import { schemaSupported, type Options } from "./misc.js";
import hasPermission from "./permissions.js";

export type CustomOperation = {
	name: string;
	description: string;
	permissions?: unknown;
	censored?: "channel" | false | undefined;
	options?: ApplicationCommandOption[];
	command(
		interaction: ChatInputCommandInteraction<"cached" | "raw">,
		options: Options,
	): Awaitable<void>;
};

const directory = fileURLToPath(new URL("./operations", import.meta.url));
const promises = (await fileSystem.readdir(directory)).map(async (file) => {
	const resolved = path.join(directory, file);
	if (path.extname(resolved) !== ".js") return;
	return (await import(pathToFileURL(path.resolve(directory, resolved)).toString())).default as
		| ApplicationCommand
		| CustomOperation
		| undefined;
});
const customOperations = (await Promise.all(promises)).filter(Boolean);

const commandSchemas = new Collection<string, (ApplicationCommand | CustomOperation)[]>();
export async function getAllSchemas(
	guild: Guild | null,
): Promise<(ApplicationCommand | CustomOperation)[]> {
	const guildId = guild?.id ?? "@me";
	if (commandSchemas.has(guildId)) return commandSchemas.get(guildId) ?? [];

	const guildCommandSchemas = [...customOperations];
	const globalCommands = await client.application.commands.fetch();
	const guildCommands = (await guild?.commands.fetch()) ?? new Collection();
	// eslint-disable-next-line unicorn/prefer-spread
	for (const [, command] of globalCommands.concat(guildCommands))
		if (command.type === ApplicationCommandType.ChatInput) guildCommandSchemas.push(command);

	commandSchemas.set(guildId, guildCommandSchemas);
	return guildCommandSchemas;
}

export default async function getSchemas(
	user: APIInteractionGuildMember | GuildMember | User,
	channel?: TextBasedChannel,
): Promise<Record<string, ApplicationCommand | CustomOperation>> {
	const allSchemas = await getAllSchemas(user instanceof GuildMember ? user.guild : null);

	const schemas = [];
	for await (const item of asyncFilter(
		allSchemas,
		async (schema) =>
			schemaSupported(schema.options ?? []) &&
			(await hasPermission(schema, user, channel)) &&
			([schema.name.toLowerCase(), schema] as const),
	))
		schemas.push(item);
	return Object.fromEntries(schemas);
}
