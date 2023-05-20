/**
 * The index of each array determines how many strikes the word gives.
 *
 * The second sub-array is for words that must be surrounded by a word boundary and the third is for words that must be preceded by a word boundary.
 *
 * All words are ROT13-encoded.
 */
const badWords: [RegExp[]?, RegExp[]?, RegExp[]?][] = [
	[
		[
		],
		[
		],
	],
	[
		[
		],
		[
		],
	],
	[
		[
		],
		[],
		[],
	],
];

if (process.env.NODE_ENV !== "production") badWords[1]?.[0].push(/nhgbzbqzhgr/);

export default badWords;
