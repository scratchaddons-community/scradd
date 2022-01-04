import url from "url";
import path from "path";
import importScripts from "./importScriptsInFolder.js";

const dirname = path.dirname(url.fileURLToPath(import.meta.url));
const commandsDir = path.resolve(dirname, "../commands");

const commands =
	/** @type {import("discord.js").Collection<string, import("./types/command").default>} */ (
		await importScripts(commandsDir)
	);
commands.forEach((command, name) => command.data.setName(name));

export default /**
 * @type {import("discord.js").Collection<
 * 	string,
 * 	{
 * 		data: Omit<
 * 			import("@discordjs/builders").SlashCommandBuilder,
 * 			"addSubcommand" | "addSubcommandGroup"
 * 		>;
 * 		interaction: (
 * 			interaction: import("discord.js").CommandInteraction<
 * 				import("discord.js").CacheType
 * 			>,
 * 		) => Promise<void> | void;
 * 	}
 * >}
 */ (commands);
