/**
 * @file Join An array with commas and the word "and".
 *
 * @template T
 *
 * @param {T[]} array
 * @param {(item: T) => string} [callback]
 */
export default function joinWithAnd(array, callback = (item) => `${item}`) {
	const last = array.pop();

	if (typeof last === "undefined") return "";

	if (array.length === 0) return callback(last);

	return `${array.map((item) => `${callback(item)}, `).join("")}and ${callback(last)}`;
}
