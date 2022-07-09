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
