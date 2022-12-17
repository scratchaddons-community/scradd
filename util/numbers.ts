const baseChars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-/=[];',.";
/** @author zakariamouhid [`convertBaseBigInt `](https://gist.github.com/ryansmith94/91d7fd30710264affeb9#gistcomment-3136187) */
export function convertBase(value: string, sourceBase: number, outBase: number, chars = baseChars) {
	const range = chars.split("");
	if (sourceBase < 2 || sourceBase > range.length)
		throw new RangeError(`sourceBase must be between 2 and ${range.length}`);
	if (outBase < 2 || outBase > range.length)
		throw new RangeError(`outBase must be between 2 and ${range.length}`);

	const outBaseBig = BigInt(outBase);

	let decValue = value
		.split("")
		.reverse()
		.reduce((carry, digit, loopIndex) => {
			const biggestBaseIndex = range.indexOf(digit);
			if (biggestBaseIndex === -1 || biggestBaseIndex > sourceBase - 1)
				throw new ReferenceError(`Invalid digit ${digit} for base ${sourceBase}.`);
			return (
				carry +
				BigInt(biggestBaseIndex) * bigIntPower(BigInt(sourceBase), BigInt(loopIndex))
			);
		}, 0n);

	let output = "";
	while (decValue > 0) {
		output = range[Number(decValue % outBaseBig)] + output;
		decValue = (decValue - (decValue % outBaseBig)) / outBaseBig;
	}
	return output || "0";
}

convertBase.MAX_BASE = baseChars.length;

/**
 * `x**y`
 *
 * @author zakariamouhid [`bigIntPow`](https://gist.github.com/ryansmith94/91d7fd30710264affeb9#gistcomment-3136187)
 */
export function bigIntPower(x: bigint, y: bigint) {
	if (y === 0n) return 1n;
	let p2: bigint = bigIntPower(x, y / 2n);
	if (y % 2n === 0n) return p2 * p2;
	return x * p2 * p2;
}

export function nth(number: number, { bold = true, jokes = true } = {}) {
	const formatted =
		number.toLocaleString() +
		([, "st", "nd", "rd"][(number / 10) % 10 ^ 1 && number % 10] || "th");
	return (
		(bold ? "**" + formatted + "**" : formatted) +
		(jokes
			? `${number}`.includes("69")
				? " (nic" + "e".repeat(Math.floor(number.toString().length / 2)) + ")"
				: /^[1-9]0+$/.test(number + "")
				? " (" + "🥳".repeat(number.toString().length - 1) + ")"
				: ""
			: "")
	);
}
