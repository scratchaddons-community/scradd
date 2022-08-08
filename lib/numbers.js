/**
 * @author <https://stackoverflow.com/a/49753367/11866686>'s `roundNearestLog` function.
 *
 * @param {number} number
 */
export function roundDownToMultipleTen(number) {
	var m = 10 ** (Math.ceil(Math.log(number + 1) / Math.LN10) - 1);
	return Math.floor(number / m) * m || number;
}

/**
 * @param {string} value
 * @param {number} soureBase
 * @param {number} outBase
 */
export function convertBase(
	value,
	soureBase,
	outBase,
	chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-=[];'/,.",
) {
	var range = chars.split("");

	var decValue = value
		.toString()
		.split("")
		.reverse()
		.reduce(
			(carry, digit, index) =>
				carry + BigInt(range.indexOf(digit) * Math.pow(soureBase, index)),
			BigInt(0),
		);

	var output = "";
	while (decValue > 0) {
		output = range[+(decValue % BigInt(outBase)).toString()] + output;
		decValue = (decValue - (decValue % BigInt(outBase))) / BigInt(outBase);
	}
	return output || "0";
}

/** @param {number} progress */
export function makeProgressBar(progress) {
	const BAR_STYLE = "░▒▓█",
		LENGTH = 31;
	const full = progress * LENGTH;
	const rounded = Math.floor(full);
	return (
		(BAR_STYLE.at(-1) || "").repeat(rounded) +
		(rounded === LENGTH
			? ""
			: (BAR_STYLE[Math.floor((full - rounded) * (BAR_STYLE.length - 1))] || "") +
			  (BAR_STYLE[0] || "")?.repeat(LENGTH - rounded - 1))
	);
}
/** @param {number} number */
export function nth(number, { bold = true, jokes = true } = {}) {
	const formatted =
		number + ([, "st", "nd", "rd"][(number / 10) % 10 ^ 1 && number % 10] || "th");
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
export const removeNth = (/** @type {string} */ string) =>
	string.split(/( \([0-9]+(th|st|nd|rd)\))*$/)[0];
