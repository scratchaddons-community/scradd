const baseChars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-=[];'/,.";
export function convertBase(value: string, sourceBase: number, outBase: number, chars = baseChars) {
	const range = chars.split("");

	let decValue = value
		.toString()
		.split("")
		.reverse()
		.reduce(
			(carry, digit, index) =>
				carry + BigInt(range.indexOf(digit) * Math.pow(sourceBase, index)),
			BigInt(0),
		);

	let output = "";
	while (decValue > 0) {
		output = range[+(decValue % BigInt(outBase)).toString()] + output;
		decValue = (decValue - (decValue % BigInt(outBase))) / BigInt(outBase);
	}
	return output || "0";
}

convertBase.MAX_BASE = baseChars.length;

/** @author [Changaco/unicode-progress-bars](https://github.com/Changaco/unicode-progress-bars/blob/f8df5e8/generator.html#L60L82) */
export function makeProgressBar(progress: number) {
	const BAR_STYLE = "░▒▓█",
		LENGTH = 29;
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
