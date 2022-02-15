/**
 * Returns the elements of an array that meet the condition specified in a callback function.
 *
 * @template T
 *
 * @param {(value: T, index: number, array: T[]) => Promise<boolean> | boolean} predicate
 * @param {T[]} array
 *
 * @returns {Promise<T[]>}
 */
export default async function asyncFilter(array, predicate) {
	const filterMap = await Promise.all(array.map(predicate));
	return array.filter((_, index) => filterMap[index]);
}
