import fileSystem from "fs/promises";
import path from "path";
import url from "url";

import { Collection } from "discord.js";

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

export async function importScripts<T, K extends string = string>(directory: string) {
	const collection: Collection<K, () => Promise<T>> = new Collection();

	const siblings = (await getFileNames(directory)).filter((file) => path.extname(file) === ".js");

	const promises = siblings.map(async (sibling) => {
		const filename = (
			path.relative(directory, sibling).split(path.extname(sibling))[0] ||
			path.relative(directory, sibling)
		)
			.split(path.sep)
			.reduce((accumulated, item) =>
				accumulated
					? accumulated + (item[0] || "").toUpperCase() + item.slice(1)
					: item.toLowerCase(),
			) as K;

		collection.set(
			filename,
			async () =>
				(await import(url.pathToFileURL(path.resolve(directory, sibling)).toString()))
					.default as T,
		);
	});

	await Promise.all(promises);

	return collection;
}

export function sanitizePath(unclean: string, noDoxx = true): string {
	const sanitized = decodeURIComponent(unclean).replaceAll("\\", "/").replaceAll("file:///", "");
	return noDoxx ? sanitized.replaceAll(sanitizePath(process.cwd(), false), ".") : sanitized;
}
