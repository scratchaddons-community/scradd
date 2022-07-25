/**
 * Generate a short, random string based off the date. Note that the length is not fixed.
 *
 * Intended for use with message components `customId`s.
 *
 * @param {string} [prefix] - An optional prefix to the hash.
 *
 * @returns {string} Hash.
 */
export default function generateHash(prefix = "") {
	return `${prefix}.${Math.round(
		Math.random() * 100_000_000 + Date.now() - 1_643_000_000_000,
	).toString(36)}`;
}
