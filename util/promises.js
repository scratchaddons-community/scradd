/**
 * Returns a generator that only gives the elements of an array that meet the condition specified in a callback function.
 *
 * @template T
 * @template X
 *
 * @param {T[]} array - Array to filter.
 * @param {(value: T, index: number, array: T[]) => Promise<X | false>} predicate - A function to asynchronously test each element for a
 *   condition.
 *
 * @returns {AsyncGenerator<Awaited<X>, void, unknown>}
 */
export async function* asyncFilter(array, predicate) {
	for (const [index, value] of array.entries()) {
		const newValue = await predicate(value, index, array);
		if (newValue !== false) yield newValue;
	}
	return;
}

/**
 * Resolves a promise when any of the promises resolve with a truey value.
 *
 * @author jaboja [`firstTrue`](https://stackoverflow.com/a/51160727/11866686)
 *
 * @param {Promise<any>[]} promises - The promises to watch.
 *
 * @returns {Promise<boolean>} - Returns a promise that resolves to `true` as soon as any of the promises resolve with a truey value, or
 *   resolves to `false` if all of the promises resolve with a different value.
 */
export async function firstTrueyPromise(promises) {
	const newPromises = promises.map(
		(promise) =>
			new Promise((resolve, reject) => {
				promise
					.then((resolved) => {
						if (resolved) resolve(true);
					})
					.catch(reject);
			}),
	);

	newPromises.push(Promise.all(promises).then(() => false));

	return await Promise.race(newPromises);
}
