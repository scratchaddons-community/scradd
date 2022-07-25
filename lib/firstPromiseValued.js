/**
 * Resolves a promise when any of the promises resolve with a specified value.
 *
 * @author <https://stackoverflow.com/a/51160727/11866686>
 *
 * @template {any} T
 *
 * @param {T} value - The value to wait for.
 * @param {Promise<T>[]} promises - The promises to watch.
 *
 * @returns {Promise<boolean>} - Returns a promise that resolves to `true` as soon as any of the
 *   promises resolve with the specified value, or resolves to `false` if all of the promises
 *   resolve with a different value.
 */
export default async function firstPromiseValued(value, promises) {
	const newPromises = promises.map(
		async (promise) =>
			await new Promise((resolve, reject) => {
				promise
					.then((resolved) => {
						if (resolved === value) {
							resolve(true);

							return true;
						}

						return false;
					})
					.catch(reject);
			}),
	);

	newPromises.push(Promise.all(promises).then(() => false));

	return await Promise.race(newPromises);
}
