import fileSystem from "fs/promises";
import path from "node:path";
import url from "node:url";

import { Collection } from "discord.js";

/**
 * Recursively get file names from a directory.
 *
 * @param directory - The directory to scan.
 *
 * @returns A list of file names.
 */
export async function getFileNames(directory: string): Promise<string[]> {
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
 * Scan for all scripts recursively in a directory. Subdirectories are converted to camelCase (aka `foo/bar.js` -> `fooBar`).
 *
 * @param directory - The directory to scan.
 *
 * @returns A collection of the scripts.
 */
export async function importScripts(directory: string): Promise<Collection<any, any>> {
	const collection = new Collection();

	const siblings = (await getFileNames(directory)).filter((file) => path.extname(file) === ".js");

	const promises = siblings.map(async (sibling) => {
		const filename = (
			path.relative(directory, sibling).split(path.extname(sibling))[0] ??
			path.relative(directory, sibling)
		)
			.split(path.sep)
			.reduce((accumulated, item) =>
				accumulated
					? accumulated + (item[0] ?? "").toUpperCase() + item.slice(1)
					: item.toLowerCase(),
			);

		const resolved = url.pathToFileURL(path.resolve(directory, sibling)).toString();

		collection.set(filename, (await import(resolved)).default);
	});

	await Promise.all(promises);

	return collection;
}

/**
 * Sanitize a path, mainly to use consistent slashes.
 *
 * @param unclean - The path to sanitize.
 * @param relative - Whether to resolve the path to be relative to the current working directory.
 */
export function sanitizePath(unclean: string, relative = true): string {
	const sanitized = decodeURIComponent(unclean).replaceAll("\\", "/").replaceAll("file:///", "");
	return relative ? sanitized.replaceAll(sanitizePath(process.cwd(), false), ".") : sanitized;
}
