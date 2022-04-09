/** @file Get All modules in a directory. */
import fileSystem from "fs/promises";
import path from "path";
import url from "url";

import { Collection } from "discord.js";

/**
 * @param {string} directory
 *
 * @returns {Promise<string[]>}
 */
export async function getFileNames(directory) {
	return (
		await Promise.all(
			(
				await fileSystem.readdir(directory)
			).map(async (file) => {
				const fullPath = path.join(directory, file);
				return (await fileSystem.lstat(fullPath)).isDirectory()
					? await getFileNames(fullPath)
					: fullPath;
			}),
		)
	).flat();
}

/**
 * Import all JavaScript files in a directory.
 *
 * @template {any} T
 *
 * @param {string} directory - The directory to import from.
 *
 * @returns {Promise<Collection<string, T>>} - The imported modules.
 */
export default async function getInDirectory(directory) {
	/** @type {Collection<string, T>} */
	const collection = new Collection();

	const siblings = (await getFileNames(directory)).filter((file) => path.extname(file) === ".js");

	const promises = siblings.map(async (sibling) => {
		const filename = (
			path
				.relative(directory, sibling)

				.split(path.extname(sibling))[0] || path.relative(directory, sibling)
		)
			.split(path.sep)
			.reduce((accumulated, item) =>
				accumulated
					? accumulated + (item[0] || "").toUpperCase() + item.slice(1).toLowerCase()
					: item.toLowerCase(),
			);

		collection.set(
			filename,
			(await import(url.pathToFileURL(path.resolve(directory, sibling)).toString())).default,
		);
	});

	await Promise.all(promises);

	return collection;
}
