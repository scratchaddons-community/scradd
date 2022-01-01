import fs from "fs/promises";
import url from "url";
import path from "path";
import type CommandInfo from "../types/command";

const dirname = path.dirname(url.fileURLToPath(import.meta.url));
const commandsDir=path.resolve(dirname,"./commands")
const siblings =( await fs.readdir(commandsDir)).filter(file => path.extname(file) === ".js");

const commands: { default: CommandInfo }[] = await Promise.all(
	siblings.map(
			(sibling) => import(url.pathToFileURL(path.resolve(commandsDir,sibling)).toString())
		),
);
export default Object.fromEntries(
	commands.map(({ default: command }) => [command.command.name, command]),
);
