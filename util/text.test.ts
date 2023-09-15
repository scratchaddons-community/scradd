import { strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { caesar, joinWithAnd, normalize, trimPatchVersion, truncateText } from "./text.js";

describe("joinWithAnd", function () {
	it("should join an array of 3 items correctly", function () {
		strictEqual(joinWithAnd(["foo", "bar", "baz"]), "foo, bar, and baz");
	});
	it("should join an array of 2 items correctly", function () {
		strictEqual(joinWithAnd(["foo", "bar"]), "foo and bar");
	});
	it("should handle an array of 1 item correctly", function () {
		strictEqual(joinWithAnd(["one"]), "one");
	});
	it("should handle an empty array correctly", function () {
		strictEqual(joinWithAnd([]), "");
	});
	it("should join an array of 3 items with a callback correctly", function () {
		strictEqual(
			joinWithAnd([1, 2, 3], (item) => `item${item}`),
			"item1, item2, and item3",
		);
	});
	it("should join an array of 2 items with a callback correctly", function () {
		strictEqual(
			joinWithAnd([1, 2], (item) => `item${item}`),
			"item1 and item2",
		);
	});
	it("should join an array of 1 item with a callback correctly", function () {
		strictEqual(
			joinWithAnd([1], (item) => `item${item}`),
			"item1",
		);
	});
});

describe("truncateText", () => {
	it("should truncate a long text to the specified maxLength", () => {
		strictEqual(
			truncateText("This is a very long text that needs to be truncated.", 20),
			"This is a very long…",
		);
	});
	it("should not truncate if maxLength is greater than or equal to text length", () => {
		strictEqual(truncateText("Short text", 50), "Short text");
	});
	it("should split at newlines", () => {
		strictEqual(truncateText("First line\nSecond line", 25), "First line…");
	});
	it("shouldn’t split at newlines with multiline on", () => {
		strictEqual(truncateText("First line\nSecond line", 25, true), "First line\nSecond line");
	});
	it("should remove redundant spaces", () => {
		strictEqual(truncateText("   Too     many   spaces   ", 15), "Too many spaces");
	});
});

describe("caesar", () => {
	it("should handle empty string input", () => {
		strictEqual(caesar(""), "");
	});
	it("should basically rotate correctly", () => {
		strictEqual(caesar("hello"), "uryyb");
	});
	it("should handle rotation with a custom rotation", () => {
		strictEqual(caesar("hello", 3), "khoor");
	});
	it("should handle rotation with negative rotation", () => {
		strictEqual(caesar("khoor", -3), "hello");
	});
	it("should handle rotation around the alphabet", () => {
		strictEqual(caesar("zebra", 1), "afcsb");
	});
	it("should handle mixed case input", () => {
		strictEqual(caesar("AbCdEf", 2), "CdEfGh");
	});
	it("should ignore non-alphabetic characters", () => {
		strictEqual(caesar("Hello, World 10!", 5), "Mjqqt, Btwqi 10!");
	});
	it("should handle large rotations", () => {
		strictEqual(caesar("Hello", 26), "Hello");
	});
});

describe("normalize", () => {
	it("should remove diacritics", () => {
		strictEqual(normalize("Café"), "Cafe");
	});
	it("should condense whitespace", () => {
		strictEqual(normalize("  This  is\t a\n test  \rstring. "), " This is a\n test \nstring. ");
	});
	it("should normalize line endings", () => {
		strictEqual(
			normalize("Line 1\r\nLine 2\nLine 3\rLine 4"),
			"Line 1\nLine 2\nLine 3\nLine 4",
		);
	});
	it("should ignore empty input", () => {
		strictEqual(normalize(""), "");
	});
	it("should ignore normal text", () => {
		strictEqual(normalize("This is a test string."), "This is a test string.");
	});
});

describe("trimPatchVersion", () => {
	it("should trim the patch version", () => {
		strictEqual(trimPatchVersion("1.0.0"), "1.0");
	});
	it("should trim multiple patch versions", () => {
		strictEqual(trimPatchVersion("1.0.0"), "1.0");
	});
	it("should ignore versions without a patch", () => {
		strictEqual(trimPatchVersion("1.0"), "1.0");
	});
	it("should ignore invalid versions", () => {
		strictEqual(trimPatchVersion("1.0"), "1.0");
	});
});
