/**
 * Returns a generator that only gives the elements of an array that meet the condition specified in
 * a callback function.
 *
 * @file Exports Function to asynchronously filter an array.
 *
 * @template T
 *
 * @param {T[] | import("discord.js").Collection<string, T>} array - Array to filter.
 * @param {(value: T, index: number, array: T[]) => Promise<boolean> | boolean} predicate - A
 *   function to asynchronously test each element for a condition.
 *
 * @returns {AsyncGenerator<Awaited<T>, void, unknown>}
 */
export default async function* asyncFilter(array, predicate) {
	let index = 0;
	for (const value of array.values()) {
		if (await predicate(value, index, [...array.values()])) yield value;
		index++;
	}
	return;
}
