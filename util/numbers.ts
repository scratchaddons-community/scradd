/**
 * `x**y`
 *
 * @author zakariamouhid [`bigIntPow`](https://gist.github.com/ryansmith94/91d7fd30710264affeb9#gistcomment-3136187)
 *
 * @param one `x`.
 * @param two `y`.
 *
 * @returns Return value.
 */
export function bigIntPower(one: bigint, two: bigint) {
	if (two === 0n) return 1n;
	const powerTwo: bigint = bigIntPower(one, two / 2n);
	if (two % 2n === 0n) return powerTwo * powerTwo;
	return one * powerTwo * powerTwo;
}

/**
 * Convert a number between bases.
 *
 * @author zakariamouhid [`convertBaseBigInt `](https://gist.github.com/ryansmith94/91d7fd30710264affeb9#gistcomment-3136187)
 *
 * @param value - The number to convert.
 * @param sourceBase - The base of the input number.
 * @param outBase - The base of the output number.
 * @param chars - The character set to use.
 */
export function convertBase(
	value: string,
	sourceBase: number,
	outBase: number,
	chars = convertBase.defaultChars,
) {
	const range = chars.split("");
	if (sourceBase < 2 || sourceBase > range.length)
		throw new RangeError(`sourceBase must be between 2 and ${range.length}`);
	if (outBase < 2 || outBase > range.length)
		throw new RangeError(`outBase must be between 2 and ${range.length}`);

	const outBaseBig = BigInt(outBase);

	let decValue = value.split("").reduceRight((carry, digit, loopIndex) => {
		const biggestBaseIndex = range.indexOf(digit);
		if (biggestBaseIndex === -1 || biggestBaseIndex > sourceBase - 1)
			throw new ReferenceError(`Invalid digit ${digit} for base ${sourceBase}.`);
		return (
			carry + BigInt(biggestBaseIndex) * bigIntPower(BigInt(sourceBase), BigInt(loopIndex))
		);
	}, 0n);

	let output = "";
	while (decValue > 0) {
		output = `${range[Number(decValue % outBaseBig)]}${output}`;
		decValue = (decValue - (decValue % outBaseBig)) / outBaseBig;
	}
	return output || "0";
}

convertBase.defaultChars =
	"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-/=[];',.";
convertBase.MAX_BASE = convertBase.defaultChars.length;

/**
 * Adds a numerical suffix to a number.
 *
 * @param number - The number to suffix.
 * @param options - Options.
 * @param options.bold - Whether to bold the output using Markdown.
 * @param options.jokes - Toggle jokes after the number.
 */
export function nth(number: number, { bold = true, jokes = true } = {}) {
	const formatted =
		number.toLocaleString() +
		([undefined, "st", "nd", "rd"][(((number + 90) % 100) - 10) % 10] ?? "th");
	return (
		(bold ? `**${formatted}**` : formatted) +
		(jokes
			? String(number).includes("69")
				? ` (nic${"e".repeat(Math.floor(number.toString().length / 2))})`
				: /^[1-9]0+$/.test(String(number))
				? ` (${"🥳".repeat(number.toString().length - 1)})`
				: ""
			: "")
	);
}
