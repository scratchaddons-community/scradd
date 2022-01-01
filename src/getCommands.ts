import fs from "fs/promises";
import url from "url";
import path from "path";
import type  CommandInfo from "../types/command";

const dirname = path.dirname(url.fileURLToPath(import.meta.url));
const siblings = await fs.readdir(dirname);
const direcoryInfoSiblings = siblings.map(async (comand) => {
	const resolvedPath = path.resolve(dirname, comand);
	return {
		path: resolvedPath,
		keep: (await fs.lstat(resolvedPath)).isDirectory()&&!comand.startsWith("."),
	};
});

const commands:CommandInfo[] =await Promise.all(
	(await Promise.all(direcoryInfoSiblings))
		.filter(({ keep }) => keep)
		.map((entry) =>
			import(url.pathToFileURL(path.resolve(entry.path, "./index.js")).toString()),
		),
);

export default Object.fromEntries(commands.map((command) =>
	[command.command.name,command]
))
