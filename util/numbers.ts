/**
 * `x**y`
 *
 * @author ryasmi [`bigIntPow`](https://github.com/ryasmi/baseroo/blob/4722145/src/baseroo.ts#L19)
 *
 * @param one `x`.
 * @param two `y`.
 *
 * @returns Return value.
 */
export function bigIntPower(one: bigint, two: bigint): bigint {
	if (two === 0n) return 1n;
	const powerTwo = bigIntPower(one, two / 2n);
	if (two % 2n === 0n) return powerTwo * powerTwo;
	return one * powerTwo * powerTwo;
}

/**
 * Convert a number between bases.
 *
 * @author ryasmi [`convertBase`](https://github.com/ryasmi/baseroo/blob/4722145/src/baseroo.ts#L79)
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
	const range = [...chars];
	if (sourceBase < 2 || sourceBase > range.length)
		throw new RangeError(`sourceBase must be between 2 and ${range.length}`);
	if (outBase < 2 || outBase > range.length)
		throw new RangeError(`outBase must be between 2 and ${range.length}`);

	const outBaseBig = BigInt(outBase);

	let decValue = [...value].toReversed().reduce((carry, digit, loopIndex) => {
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
	// eslint-disable-next-line unicorn/string-content
	"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-/=[];',.";
convertBase.MAX_BASE = convertBase.defaultChars.length;

/**
 * Adds a numerical suffix to a number.
 *
 * @param number - The number to suffix.
 */
export function nth(number: number) {
	return (
		number.toLocaleString() +
		([undefined, "st", "nd", "rd"][(((number + 90) % 100) - 10) % 10] ?? "th")
	);
}

export function parseTime(time: string): Date {
	const number = Number(time);

	if (!Number.isNaN(number)) {
		if (number > 1_000_000_000_000) return new Date(number);
		else if (number > 1_000_000_000) return new Date(number * 1000);
		else return new Date(Date.now() + number * 3_600_000);
	}

	const dateMatch =
		/^(?<year>\d{4})-?(?<month>\d{1,2})-?(?<day>\d{1,2})(?:(?:\s+|T)(?<hour>\d{1,2}):(?<minute>\d{1,2})(?::?(?<second>\d{1,2}))?Z?)?$/.exec(
			time,
		);
	if (dateMatch) {
		const {
			year = "",
			month = "",
			day = "",
			hour = "",
			minute = "",
			second = "",
		} = dateMatch.groups ?? {};
		return new Date(
			`${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(
				2,
				"0",
			)}T${hour.padStart(2, "0")}:${minute.padStart(2, "0")}:${second.padStart(2, "0")}Z`,
		);
	}

	const date = new Date();
	const otherDate = new Date(date);

	const timeMatch = /^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/.exec(time);
	if (timeMatch) {
		const [hours = 0, minutes = 0, seconds = 0] = timeMatch.slice(1).map(Number);
		console.log({ hours, minutes, seconds });
		otherDate.setUTCHours(hours, minutes, seconds || 0, 0);
		if (date.getUTCHours() >= hours) otherDate.setUTCDate(date.getUTCDate() + 1);
		return otherDate;
	}

	const {
		years = 0,
		months = 0,
		weeks = 0,
		days = 0,
		hours = 0,
		minutes = 0,
		seconds = 0,
	} = new RegExp(
		/^\s*(?:(?<years>.\d+|\d+(?:.\d+)?)\s*y(?:(?:ea)?rs?)?\s*)?\s*/.source +
			/(?:(?<months>.\d+|\d+(?:.\d+)?)\s*mo?n?ths?\s*)?\s*/.source +
			/(?:(?<weeks>.\d+|\d+(?:.\d+)?)\s*w(?:(?:ee)?ks?)?\s*)?\s*/.source +
			/(?:(?<days>.\d+|\d+(?:.\d+)?)\s*d(?:ays?)?\s*)?\s*/.source +
			/(?:(?<hours>.\d+|\d+(?:.\d+)?)\s*h(?:(?:ou)?rs?)?\s*)?\s*/.source +
			/(?:(?<minutes>.\d+|\d+(?:.\d+)?)\s*m(?:in(?:ute)?s?)?)?\s*/.source +
			/(?:(?<seconds>.\d+|\d+(?:.\d+)?)\s*s(?:ec(?:ond)?s?)?)?\s*$/.source,
		"i",
	).exec(time)?.groups ?? {};

	date.setUTCFullYear(date.getUTCFullYear() + +years);
	otherDate.setUTCFullYear(otherDate.getUTCFullYear() + Math.ceil(+years));
	const fractionalYears = (+otherDate - +date) * (+years % 1);

	date.setUTCMonth(date.getUTCMonth() + +months);
	otherDate.setUTCFullYear(date.getUTCFullYear(), otherDate.getUTCMonth() + Math.ceil(+months));
	const fractionalMonths = (+otherDate - +date) * (+months % 1);

	const totalDays = +weeks * 7 + +days;
	const totalHours = totalDays * 24 + +hours;
	const totalMinutes = totalHours * 60 + +minutes;
	const totalSeconds = totalMinutes * 60 + +seconds;

	return new Date(+date + fractionalYears + fractionalMonths + totalSeconds * 1000);
}

const COLOR_CHANNELS = ["red", "green", "blue"] as const;
export function lerpColors(allColors: number[], percent: number) {
	if (allColors.length === 0) throw new RangeError("Color array must not be empty.");
	if (allColors.length === 1) return allColors[0];

	const count = allColors.length - 1;
	const index = Math.floor(count * percent);

	const distance = count === 1 ? percent : (percent - index / count) * count;
	const colors = allColors.slice(index, index + 2) as [typeof allColors[0], typeof allColors[1]];

	const channelsByColor = colors.map((color) => ({
		red: (color >> 16) & 0xff,
		green: (color >> 8) & 0xff,
		blue: color & 0xff,
	}));

	const [red, green, blue] = COLOR_CHANNELS.map((channel) =>
		channelsByColor
			.map((color) => color[channel])
			.reduce((one, two) => one + (two - one) * distance),
	);
	return (red << 16) | (green << 8) | blue;
}
