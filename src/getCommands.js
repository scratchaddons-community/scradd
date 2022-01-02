import fs from "fs/promises";
import url from "url";
import path from "path";

const dirname = path.dirname(url.fileURLToPath(import.meta.url));
const commandsDir = path.resolve(dirname, "./commands");
const siblings = (await fs.readdir(commandsDir)).filter((file) => path.extname(file) === ".js");

/** @type {{ default: import("../types/command").default }[]} */
const commands = await Promise.all(
	siblings.map((sibling) =>
		import(url.pathToFileURL(path.resolve(commandsDir, sibling)).toString()),
	),
);
export default Object.fromEntries(
	commands.map(({ default: command }) => [command.command.name, command]),
);
