/** Returns a generator that only gives the elements of an array that meet the condition specified in a callback function. */
export async function* asyncFilter<T, X>(
	array: T[],
	predicate: (value: T, index: number, array: T[]) => Promise<X | false>,
) {
	for (const [index, value] of array.entries()) {
		// eslint-disable-next-line no-await-in-loop -- This is the whole point of this function.
		const newValue = await predicate(value, index, array);

		if (newValue !== false) yield newValue;
	}
}

/**
 * Resolves a promise when any of the promises resolve with a truey value.
 *
 * @author jaboja [`firstTrue`](https://stackoverflow.com/a/51160727/11866686)
 *
 * @returns Returns a promise that resolves to `true` as soon as any of the promises resolve with a truey value, or resolves to `false` if
 *   all of the promises resolve with a different value.
 */
export async function firstTrueyPromise(promises: Promise<any>[]) {
	const newPromises = promises.map(
		async (promise) =>
			await new Promise<boolean>((resolve, reject) => {
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
