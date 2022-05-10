/** @file Fetch And output all commands. */
import { importScripts } from "../lib/files.js";
import path from "path";
import url from "url";
import { Collection } from "discord.js";
import { AssertionError } from "assert";

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
			commands.map(async (curr, name) => {
				const command = typeof curr === "function" ? await curr.call(client) : curr;
				if (command.data.name)
					throw new AssertionError({
						actual: command.data.name,
						expected: "",
						operator: name,
						message: "Don't manually set the command name, it will use the file name.",
					});
				command.data = command.data.setName(name);
				return /** @type {const} */ ([name, command]);
			}),
		),
	));
};
