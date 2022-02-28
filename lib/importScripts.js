/** @file Get All modules in a directory. */
import fileSystem from "fs/promises";
import path from "path";
import url from "url";

import { Collection } from "discord.js";

/**
 * Import all JavaScript files in a directory.
 *
 * @template {string} T
 * @template {keyof import("discord.js").ClientEvents} K
 *
 * @param {T} directory - The directory to import from.
 *
 * @returns {Promise<
 * 	T extends `${string}commands`
 * 		? Collection<string, import("../types/command").default>
 * 		: T extends `${string}events`
 * 		? Collection<K, import("../types/event").default<K>>
 * 		: Collection<string, unknown>
 * >}
 *   - The imported modules.
 */
export default async function getInDirectory(directory) {
	const collection = new Collection();

	const siblings = (await fileSystem.readdir(directory)).filter(
		(file) => path.extname(file) === ".js",
	);

	const promises = siblings.map(async (sibling) => {
		const filename = path.basename(sibling).split(path.extname(sibling))[0] || "";

		collection.set(
			filename,
			(await import(url.pathToFileURL(path.resolve(directory, sibling)).toString())).default,
		);
	});

	await Promise.all(promises);

	return /** @type {any} */ (collection);
}
