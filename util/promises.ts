/**
 * Returns a generator that only gives the elements of an array that meet the condition specified in a callback
 * function.
 */
export async function* asyncFilter<T, X>(
	array: T[],
	predicate: (value: T, index: number, array: T[]) => Promise<X | false>,
): AsyncGenerator<Awaited<X>, void> {
	const BATCH_SIZE = 50;

	let currentIndex = 0;
	while (currentIndex < array.length) {
		const batch = array.slice(currentIndex, currentIndex + BATCH_SIZE);
		const index = currentIndex;
		const promises = batch.map((value, subindex) => predicate(value, subindex + index, array));

		while (promises.length > 0) {
			const resolved = await Promise.race(
				promises.map(async (promise, subindex) => ({ result: await promise, subindex })),
			);

			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			promises.splice(resolved.subindex, 1);
			if (resolved.result !== false) yield resolved.result;
		}

		currentIndex += BATCH_SIZE;
	}
}

/**
 * Resolves a promise when any of the promises resolve with a truey value.
 *
 * @author jaboja [`firstTrue`](https://stackoverflow.com/a/51160727/11866686)
 * @returns Returns a promise that resolves to `true` as soon as any of the promises resolve with a truey value, or
 *   resolves to `false` if all of the promises resolve with a different value.
 */
export async function anyPromise(promises: Promise<unknown>[]): Promise<boolean> {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function gracefulFetch<T = any>(apiUrl: string): Promise<T | undefined> {
	return await fetch(apiUrl)
		.then((response) => response.json<T>())
		.catch(() => void 0);
}
