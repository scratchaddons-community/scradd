/** @file Fetch And output all commands. */
import { importScripts } from "../lib/files.js";
import path from "path";
import url from "url";
import { Collection } from "discord.js";

const dirname = path.dirname(url.fileURLToPath(import.meta.url));

const commands = await /**
 * @type {Promise<
 * 	import("discord.js").Collection<string, import("../types/command").default>
 * >}
 */ (importScripts(path.resolve(dirname, "../commands")));

/**
 * @type {| import("discord.js").Collection<string, import("../types/command").CommandInfo>
 * 	| undefined}
 */
let processed;

/** @param {import("discord.js").Client<true>} client */
export default async (client) => {
	return (processed ||= new Collection(
		await Promise.all(
			commands.map(
				/** @returns {Promise<[string, import("../types/command").CommandInfo]>} */ async (
					curr,
					name,
				) => {
					const command = typeof curr === "function" ? await curr.call(client) : curr;
					if (command.data.name)
						throw new Error(
							`${command.data.name}/${name}: ` +
								"Don't manually set the command name, it will use the file name.",
						);
					command.data = command.data.setName(name);
					return [name, command];
				},
			),
		),
	));
};
