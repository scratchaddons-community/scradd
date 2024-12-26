import { AssertionError, strictEqual } from "node:assert";
import { describe, it } from "node:test";

import { bigIntPower, convertBase, formatDuration, lerpColors, nth, parseTime } from "./numbers.ts";

await describe("bigintPow", async () => {
	await it("should correctly calculate the power of a bigint when exponent is 0", () => {
		strictEqual(bigIntPower(2n, 0n), 1n);
	});
	await it("should correctly calculate the power of a bigint when exponent is 1", () => {
		strictEqual(bigIntPower(2n, 1n), 2n);
	});
	await it("should correctly calculate the power of a bigint when exponent is even", () => {
		strictEqual(bigIntPower(3n, 4n), 81n);
	});
	await it("should correctly calculate the power of a bigint when exponent is odd", () => {
		strictEqual(bigIntPower(2n, 3n), 8n);
	});
	await it("should correctly calculate the power of a bigint with a large exponent", () => {
		strictEqual(bigIntPower(2n, 100n), 1_267_650_600_228_229_401_496_703_205_376n);
	});
	await it("should correctly calculate the power of a negative bigint", () => {
		strictEqual(bigIntPower(-2n, 3n), -8n);
	});
});

await describe("convertBase", async () => {
	await it("should convert base 16 to 10", () => {
		strictEqual(convertBase("8F", 16, 10), "143");
	});
	await it("should convert base 16 to 2", () => {
		strictEqual(convertBase("A", 16, 2), "1010");
	});
	await it("should convert an empty input string to 0", () => {
		strictEqual(convertBase("", 16, 10), "0");
	});
	await it("should convert BigInts too", () => {
		const input =
			"4EF57AA335B86BCE90CD99144BE26FA47645C36624EEB54AE153BC67861F9A7AD96E23E0D200348BD6A442EF96BD04A2C";
		strictEqual(convertBase(convertBase(input, 16, 10), 10, 16), input);
	});
});

await describe("nth", async () => {
	await it("should return `th` for numbers ending in 0", () => {
		strictEqual(nth(0), "0th");
		strictEqual(nth(20), "20th");
		strictEqual(nth(30), "30th");
	});
	await it("should return `st` for numbers ending in 1", () => {
		strictEqual(nth(1), "1st");
		strictEqual(nth(21), "21st");
		strictEqual(nth(31), "31st");
	});
	await it("should return `nd` for numbers ending in 2", () => {
		strictEqual(nth(2), "2nd");
		strictEqual(nth(22), "22nd");
		strictEqual(nth(42), "42nd");
	});
	await it("should return `rd` for numbers ending in 3", () => {
		strictEqual(nth(3), "3rd");
		strictEqual(nth(23), "23rd");
		strictEqual(nth(33), "33rd");
	});
	await it("should return `th` for numbers ending in 4-9", () => {
		strictEqual(nth(4), "4th");
		strictEqual(nth(5), "5th");
		strictEqual(nth(9), "9th");
		strictEqual(nth(25), "25th");
		strictEqual(nth(99), "99th");
	});
	await it("should return `th` for numbers ending in 11-13", () => {
		strictEqual(nth(11), "11th");
		strictEqual(nth(12), "12th");
		strictEqual(nth(13), "13th");
		strictEqual(nth(113), "113th");
	});
});

await describe("parseTime", async () => {
	await it("should support UNIX timestamps", () => {
		strictEqual(+parseTime("1713675600000"), 1_713_675_600_000);
		strictEqual(+parseTime("1720242000"), 1_720_242_000_000);
	});
	await it("should support yyyy-mm-dd", () => {
		strictEqual(+parseTime("2024-01-01"), 1_704_067_200_000);
	});
	await it("should support yyyy-mm-dd h:mm", () => {
		strictEqual(+parseTime("2024-01-01 5:00"), 1_704_085_200_000);
	});
	await it("should support yyyy-mm-dd hh:mm", () => {
		strictEqual(+parseTime("2024-01-01 12:00"), 1_704_110_400_000);
	});
	await it("should support yyyy-mm-dd hh:mm:ss", () => {
		strictEqual(+parseTime("2024-01-01 12:00:30"), 1_704_110_430_000);
	});
	await it("should support weeks", () => {
		let now = Date.now();
		almostEqual(+parseTime("1 week"), now + 604_800_000);
		now = Date.now();
		almostEqual(+parseTime("1weeks"), now + 604_800_000);
		now = Date.now();
		almostEqual(+parseTime("1wk"), now + 604_800_000);
		now = Date.now();
		almostEqual(+parseTime("1wks"), now + 604_800_000);
		now = Date.now();
		almostEqual(+parseTime("1w"), now + 604_800_000);
	});
	await it("should support days", () => {
		let now = Date.now();
		almostEqual(+parseTime("1 day"), now + 86_400_000);
		now = Date.now();
		almostEqual(+parseTime("1days"), now + 86_400_000);
		now = Date.now();
		almostEqual(+parseTime("1d"), now + 86_400_000);
	});
	await it("should support hours", () => {
		let now = Date.now();
		almostEqual(+parseTime("1"), now + 3_600_000);
		now = Date.now();
		almostEqual(+parseTime("1hour"), now + 3_600_000);
		now = Date.now();
		almostEqual(+parseTime("1hours"), now + 3_600_000);
		now = Date.now();
		almostEqual(+parseTime("1hr"), now + 3_600_000);
		now = Date.now();
		almostEqual(+parseTime("1hrs"), now + 3_600_000);
		now = Date.now();
		almostEqual(+parseTime("1h"), now + 3_600_000);
	});
	await it("should support minutes", () => {
		let now = Date.now();
		almostEqual(+parseTime("1 minute"), now + 60_000);
		now = Date.now();
		almostEqual(+parseTime("1minutes"), now + 60_000);
		now = Date.now();
		almostEqual(+parseTime("1min"), now + 60_000);
		now = Date.now();
		almostEqual(+parseTime("1mins"), now + 60_000);
		now = Date.now();
		almostEqual(+parseTime("1m"), now + 60_000);
	});
	await it("should support seconds", () => {
		let now = Date.now();
		almostEqual(+parseTime("1 second"), now + 1000);
		now = Date.now();
		almostEqual(+parseTime("1seconds"), now + 1000);
		now = Date.now();
		almostEqual(+parseTime("1sec"), now + 1000);
		now = Date.now();
		almostEqual(+parseTime("1secs"), now + 1000);
		now = Date.now();
		almostEqual(+parseTime("1s"), now + 1000);
	});
	await it("should support leading 0", () => {
		const now = Date.now();
		almostEqual(+parseTime("01m"), now + 60_000);
	});
	await it("should support decimals", () => {
		const now = Date.now();
		almostEqual(+parseTime("1.5m"), now + 90_000);
	});
	await it("should support combinations", () => {
		const now = Date.now();
		almostEqual(+parseTime("1w1h"), now + 604_800_000 + 3_600_000);
	});
	await it("should return the current time on an invalid value", () => {
		const now = Date.now();
		almostEqual(+parseTime("a"), now);
	});
});

await describe("lerpColors", async () => {
	await it("should interpolate three colors correctly", () => {
		strictEqual(lerpColors([0xff_00_00, 0x00_ff_00, 0x00_00_ff], 0.25), 0x7f_7f_00);
	});
	await it("should interpolate two colors correctly", () => {
		strictEqual(lerpColors([0xff_00_00, 0x00_00_ff], 0.75), 0x3f_00_bf);
	});
	await it("should handle single colors", () => {
		strictEqual(lerpColors([0xff_00_00], 0.5), 0xff_00_00);
	});
	await it("should handle a percent of 1", () => {
		strictEqual(lerpColors([0xff_00_00, 0x00_ff_00], 1), 0x00_ff_00);
	});
	await it("should handle a percent of 0", () => {
		strictEqual(lerpColors([0xff_00_00, 0x00_ff_00], 0), 0xff_00_00);
	});
});

await describe("formatDuration", async () => {
	await it("should handle durations less than 45 seconds", () => {
		strictEqual(formatDuration(1000), "a few seconds");
		strictEqual(formatDuration(44_000), "a few seconds");
	});
	await it("should handle durations close to 1 minute", () => {
		strictEqual(formatDuration(50_000), "a minute");
		strictEqual(formatDuration(60_000), "a minute");
	});
	await it("should handle durations between 1 and 45 minutes", () => {
		strictEqual(formatDuration(2 * 60_000), "2 minutes");
		strictEqual(formatDuration(44 * 60_000), "44 minutes");
	});
	await it("should handle durations close to 1 hour", () => {
		strictEqual(formatDuration(50 * 60_000), "an hour");
		strictEqual(formatDuration(60 * 60_000), "an hour");
	});
	await it("should handle durations between 1 and 21.5 hours", () => {
		strictEqual(formatDuration(2 * 60 * 60_000), "2 hours");
		strictEqual(formatDuration(21 * 60 * 60_000), "21 hours");
	});
	await it("should handle durations close to 1 day", () => {
		strictEqual(formatDuration(23 * 60 * 60_000), "a day");
		strictEqual(formatDuration(24 * 60 * 60_000), "a day");
	});
	await it("should handle durations between 1 and 25.5 days", () => {
		strictEqual(formatDuration(2 * 24 * 60 * 60_000), "2 days");
		strictEqual(formatDuration(25 * 24 * 60 * 60_000), "25 days");
	});
	await it("should handle durations close to 1 month", () => {
		strictEqual(formatDuration(29 * 24 * 60 * 60_000), "a month");
		strictEqual(formatDuration(30 * 24 * 60 * 60_000), "a month");
	});
	await it("should handle durations between 1 and 10.5 months", () => {
		strictEqual(formatDuration(2 * 30 * 24 * 60 * 60_000), "2 months");
		strictEqual(formatDuration(10 * 30 * 24 * 60 * 60_000), "10 months");
	});
	await it("should handle durations close to 1 year", () => {
		strictEqual(formatDuration(364 * 24 * 60 * 60_000), "a year");
		strictEqual(formatDuration(365 * 24 * 60 * 60_000), "a year");
	});
	await it("should handle durations greater than 1 year", () => {
		strictEqual(formatDuration(2 * 365 * 24 * 60 * 60_000), "2 years");
		strictEqual(formatDuration(5 * 365 * 24 * 60 * 60_000), "5 years");
	});
});

function almostEqual(actual: number, expected: number, message?: string): void {
	const diff = Math.abs(actual - expected);
	if (diff > 5)
		throw new AssertionError({
			message: message || `${actual} is not almost equal to ${expected}`,
			actual,
			expected,
			operator: "almostEqual",
			stackStartFn: almostEqual,
		});
}
