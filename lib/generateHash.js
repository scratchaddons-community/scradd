/**
 * Generate a short, random string based off the date. Note that the length is not fixed.
 *
 * @file Generate Short string guaranteed to never be the same from call to call.
 *
 * @param {string} [prefix] - An optional prefix to the hash.
 *
 * @returns {string} Hash.
 */
export default function generateHash(prefix = "") {
	return prefix + Math.round(Math.random() * 100000000 + Date.now() - 1643000000000).toString(36);
}
