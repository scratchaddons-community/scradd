/**
 * Resolves a promise when any of the promises resolve with a specified value.
 *
 * @author <https://stackoverflow.com/a/51160727/11866686>
 *
 * @param {any} value - The value to wait for.
 * @param {Promise<any>[]} promises - The promises to watch.
 *
 * @returns {Promise<boolean>} - Returns a promise that resolves to `true` as soon as any of the
 *   promises resolve with the specified value, or resolves to `false` if all of the promises
 *   resolve with a different value.
 */
export default function firstPromiseWithValue(value, promises) {
	const newPromises = promises.map(
		(promise) =>
			new Promise((resolve, reject) =>
				promise.then((resolved) => resolved === value && resolve(true), reject),
			),
	);
	newPromises.push(Promise.all(promises).then(() => false));
	return Promise.race(newPromises);
}
