import fileSystem from "fs/promises";
import path from "node:path";

/**
 * @param {string} directory
 *
 * @returns {Promise<string[]>}
 */
async function getFileNames(directory) {
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

/** @param {string} directory */
async function importScripts(directory) {
	/** @type {string[]} */
	const files = [];

	const siblings = await getFileNames(directory);

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

		files.push(filename, await fileSystem.readFile(path.resolve(directory, sibling), "utf-8"));
	});

	await Promise.all(promises);

	return files;
}

console.log(
	(
		await Promise.all(
			(
				await fileSystem.readdir("./modules")
			).map(async (file) => {
				const fullPath = path.resolve("./modules", file);
				return /** @type {const} */ ([
					file,
					(await fileSystem.lstat(fullPath)).isDirectory()
						? (await importScripts(fullPath)).reduce((a, b) => a + b.length, 0)
						: (await fileSystem.readFile(fullPath, "utf-8")).length,
				]);
			}),
		)
	).sort((one, two) => one[1] - two[1]),
);
