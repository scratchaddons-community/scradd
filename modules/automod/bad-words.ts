/* On production, this file is replaced with another file with the same structure. */

import constants from "../../common/constants.js";

/**
 * The index of each array determines how many strikes the word gives.
 *
 * The second sub-array is for words that must be surrounded by a word boundary and the third is for words that must be
 * preceded by a word boundary.
 *
 * All RegExps are ROT13-encoded. Additionally, RegExp character classes are not supported here. Use capture groups
 * instead.
 */
const badWords: [RegExp[], RegExp[], RegExp[]][] = [
	[[], [], []],
	[[], [], []],
	[[], [], []],
];

if (constants.env !== "production") badWords[1]?.[0]?.push(/nhgbzbqzhgr/);

export default badWords;
