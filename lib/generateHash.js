/**
 * Generate a short, random string based off of the date.
 *
 * @param {string} [prefix]
 */
export default function generateHash(prefix = "") {
	return prefix + Math.round(Math.random() * 100000000 + Date.now() - 1643000000000).toString(36);
}
