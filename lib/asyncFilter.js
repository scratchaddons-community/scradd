/**
 * Returns the elements of an array that meet the condition specified in a callback function.
 *
 * @file Exports Function to asynchronously filter an array.
 *
 * @template T
 *
 * @param {T[]} array - Array to filter.
 * @param {(value: T, index: number, array: T[]) => Promise<boolean> | boolean} predicate - A
 *   function to asynchronously test each element for a condition.
 *
 * @returns {Promise<T[]>} - Filtered array.
 */
export default async function asyncFilter(array, predicate) {
	const filterMap = await Promise.all(array.map(predicate));

	return array.filter((_, index) => filterMap[+index]);
}
