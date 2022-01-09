import fs from "fs/promises";
import url from "url";
import path from "path";
import { Collection } from "discord.js";

/**
 * @template {string} T
 * @template {keyof import("discord.js").ClientEvents} K
 * @param {T} dir
 */
export default async function getInDir(dir) {
	/**
	 * @type {T extends `${string}commands`
	 * 	? Collection<string, import("../types/command").default>
	 * 	: T extends `${string}events`
	 * 	? Collection<
	 * 			K,
	 * 			(
	 * 				...args: import("discord.js").ClientEvents[K]
	 * 			) => import("discord.js").Awaitable<void>
	 * 	  >
	 * 	: any}
	 */
	const collection = new Collection();

	const siblings = (await fs.readdir(dir)).filter((file) => path.extname(file) === ".js");

	const promises = siblings.map(async (sibling) => {
		const filename = path.basename(sibling).split(path.extname(sibling))[0] || "";
		collection.set(
			filename,
			(await import(url.pathToFileURL(path.resolve(dir, sibling)).toString())).default,
		);
	});

	await Promise.all(promises);

	return collection;
}
