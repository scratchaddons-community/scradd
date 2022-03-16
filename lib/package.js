import fileSystem from "fs/promises";
import path from "path";
import url from "url";

export default JSON.parse(
	await fileSystem.readFile(
		path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "../package.json"),
		"utf8",
	),
);
