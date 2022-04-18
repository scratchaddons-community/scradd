/** @file Fetch And output all commands. */
import importScripts from "./importScripts.js";
import path from "path";
import url from "url";

const dirname = path.dirname(url.fileURLToPath(import.meta.url));

const commands = await /**
 * @type {Promise<
 * 	import("discord.js").Collection<string, import("../types/command").default>
 * >}
 */ (importScripts(path.resolve(dirname, "../commands")));

for (const [name, command] of commands.entries()) {
	if (command.data.name)
		throw new Error("Don't manually set the command name, it will use the file name.");
	command.data.setName(name);
}

export default commands;
