import type { Snowflake } from "discord.js";

export function convertBase(
	value: string,
	sourceBase: number,
	outBase: number,
	chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-=[];'/,.",
) {
	var range = chars.split("");

	var decValue = value
		.toString()
		.split("")
		.reverse()
		.reduce(
			(carry, digit, index) =>
				carry + BigInt(range.indexOf(digit) * Math.pow(sourceBase, index)),
			BigInt(0),
		);

	var output = "";
	while (decValue > 0) {
		output = range[+(decValue % BigInt(outBase)).toString()] + output;
		decValue = (decValue - (decValue % BigInt(outBase))) / BigInt(outBase);
	}
	return output || "0";
}

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

/**
 * Converts a snowflake ID string into a JS Date object.
 *
 * @author [vegeta/snow-stamp](https://github.com/vegeta897/snow-stamp/blob/5f2f9c2/src/convert.js#L1L9)
 */
export function convertSnowflakeToDate(snowflake: Snowflake) {
	// Convert snowflake to BigInt to extract timestamp bits
	// https://discord.com/developers/docs/reference#snowflakes
	const milliseconds = BigInt(snowflake) >> 22n;
	return new Date(Number(milliseconds) + 1_420_070_400_000);
}

/**
 * Convert milliseconds to time string (hh:mm:ss:mss).
 *
 * @author VisioN [`toTimeString`](https://stackoverflow.com/a/35890816/11866686)
 */
export function millisecondsToTime(milliseconds: number) {
	const timeString = new Date(milliseconds).toISOString().slice(11, -1);

	if (milliseconds >= 86_400_000) {
		// to extract ["hh", "mm:ss[.mss]"]
		const [hours = 0, rest = ""] = timeString.split(/:(?=\d{2}:)/);
		return (
			+hours -
			-24 * Math.floor(milliseconds / 86_400_000) +
			"h " +
			rest.replace(":", "m ") +
			"s"
		);
	}

	return timeString.replace(":", "h ").replace(":", "m ") + "s";
}

/** @author captain-yossarian From Ukraine [`Mapped`](https://stackoverflow.com/a/69090186/11866686) */
export type NumberSmallerThan<
	N extends number,
	Result extends Array<unknown> = [],
> = Result["length"] extends N
	? Result[number]
	: NumberSmallerThan<N, [...Result, Result["length"]]>;
