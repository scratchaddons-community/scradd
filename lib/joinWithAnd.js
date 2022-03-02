/**
 * @file Join An array with commas and the word "and".
 *
 * @template T
 *
 * @param {T[]} array
 * @param {(item: T) => string} [callback]
 */
export default function join(array, callback = (item) => `${item}`) {
	const last = array.pop();

	if (typeof last === "undefined") return "(N/A)";

	if (array.length === 0) return callback(last);

	return `${array.map((item) => `${callback(item)}, `).join("")}and ${callback(last)}`;
}
