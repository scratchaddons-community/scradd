import { AssertionError, strictEqual } from "node:assert";
import { bigIntPower, convertBase, nth, parseTime } from "./numbers.js";
import { describe, it } from "node:test";

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
		almostEqual(+parseTime("1713675600000"), 1_713_675_600_000);
		almostEqual(+parseTime("1720242000"), 1_720_242_000_000);
	});
	await it("should support weeks", () => {
		almostEqual(+parseTime("1 week"), Date.now() + 604_800_000);
		almostEqual(+parseTime("1weeks"), Date.now() + 604_800_000);
		almostEqual(+parseTime("1wk"), Date.now() + 604_800_000);
		almostEqual(+parseTime("1wks"), Date.now() + 604_800_000);
		almostEqual(+parseTime("1w"), Date.now() + 604_800_000);
	});
	await it("should support days", () => {
		almostEqual(+parseTime("1 day"), Date.now() + 86_400_000);
		almostEqual(+parseTime("1days"), Date.now() + 86_400_000);
		almostEqual(+parseTime("1d"), Date.now() + 86_400_000);
	});
	await it("should support hours", () => {
		almostEqual(+parseTime("1"), Date.now() + 3_600_000);
		almostEqual(+parseTime("1hour"), Date.now() + 3_600_000);
		almostEqual(+parseTime("1hours"), Date.now() + 3_600_000);
		almostEqual(+parseTime("1hr"), Date.now() + 3_600_000);
		almostEqual(+parseTime("1hrs"), Date.now() + 3_600_000);
		almostEqual(+parseTime("1h"), Date.now() + 3_600_000);
	});
	await it("should support minutes", () => {
		almostEqual(+parseTime("1 minute"), Date.now() + 60_000);
		almostEqual(+parseTime("1minutes"), Date.now() + 60_000);
		almostEqual(+parseTime("1min"), Date.now() + 60_000);
		almostEqual(+parseTime("1mins"), Date.now() + 60_000);
		almostEqual(+parseTime("1m"), Date.now() + 60_000);
	});
	await it("should support seconds", () => {
		almostEqual(+parseTime("1 second"), Date.now() + 1000);
		almostEqual(+parseTime("1seconds"), Date.now() + 1000);
		almostEqual(+parseTime("1sec"), Date.now() + 1000);
		almostEqual(+parseTime("1secs"), Date.now() + 1000);
		almostEqual(+parseTime("1s"), Date.now() + 1000);
	});
	await it("should support leading 0", () => {
		almostEqual(+parseTime("01m"), Date.now() + 60_000);
	});
	await it("should support decimals", () => {
		almostEqual(+parseTime("1.5m"), Date.now() + 90_000);
	});
	await it("should support combinations", () => {
		almostEqual(+parseTime("1w1h"), Date.now() + 604_800_000 + 3_600_000);
	});
	await it("should return the current time on an invalid value", () => {
		almostEqual(+parseTime("a"), Date.now());
	});
});

function almostEqual(actual: number, expected: number, message?: string | undefined) {
	const diff = Math.abs(actual - expected);
	if (diff > 10) {
		throw new AssertionError({
			message: message || `${actual} is not almost equal to ${expected}`,
			actual,
			expected,
			operator: "almostEqual",
			stackStartFn: almostEqual,
		});
	}
}
