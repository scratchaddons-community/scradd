import url from "url";
import path from "path";
import importScripts from "../fileSystem/importScriptsInFolder.js";

const dirname = path.dirname(url.fileURLToPath(import.meta.url));
const commandsDir = path.resolve(dirname, "../../commands");

const commands = /** @type {import("discord.js").Collection<string,import("../types/command").default>} */(await importScripts(commandsDir));
commands.forEach((command,name)=>command.data.setName(name))

export default commands
