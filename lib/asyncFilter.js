/**
 * Returns a generator that only gives the elements of an array that meet the condition specified in
 * a callback function.
 *
 * @file Exports Function to asynchronously map and filter an array.
 *
 * @template T
 * @template X
 *
 * @param {T[] | import("discord.js").Collection<string, T>} array - Array to filter.
 * @param {(value: T, index: number, array: T[]) => Promise<X | false> | X | false} predicate - A
 *   function to asynchronously test each element for a condition.
 *
 * @returns {AsyncGenerator<Awaited<X>, void, unknown>}
 */
export default async function* asyncFilter(array, predicate) {
	let index = 0;
	for (const value of array.values()) {
		const newValue = await predicate(value, index, [...array.values()]);
		if (newValue !== false) yield newValue;
		index++;
	}
	return;
}
