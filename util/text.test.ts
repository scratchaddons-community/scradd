import { deepStrictEqual, strictEqual } from "node:assert";
import { describe, it } from "node:test";

import { caesar, joinWithAnd, normalize, trimPatchVersion, truncateText } from "./text.ts";

await describe("joinWithAnd", async () => {
	await it("should join an array of 3 items correctly", () => {
		strictEqual(joinWithAnd(["foo", "bar", "baz"]), "foo, bar, and baz");
	});
	await it("should join an array of 2 items correctly", () => {
		strictEqual(joinWithAnd(["foo", "bar"]), "foo and bar");
	});
	await it("should handle an array of 1 item correctly", () => {
		strictEqual(joinWithAnd(["one"]), "one");
	});
	await it("should handle an empty array correctly", () => {
		strictEqual(joinWithAnd([]), "");
	});
	await it("should join an array of 3 items with a callback correctly", () => {
		strictEqual(
			joinWithAnd([1, 2, 3], (item) => `item${item}`),
			"item1, item2, and item3",
		);
	});
	await it("should join an array of 2 items with a callback correctly", () => {
		strictEqual(
			joinWithAnd([1, 2], (item) => `item${item}`),
			"item1 and item2",
		);
	});
	await it("should join an array of 1 item with a callback correctly", () => {
		strictEqual(
			joinWithAnd([1], (item) => `item${item}`),
			"item1",
		);
	});
	await it("should not change the original array", () => {
		const array = ["foo", "bar", "baz"];
		joinWithAnd(array);
		deepStrictEqual(array, ["foo", "bar", "baz"]);
	});
});

await describe("truncateText", async () => {
	await it("should not have trailing spaces", () => {
		strictEqual(
			truncateText("This is a very long text that needs to be truncated.", 20),
			"This is a very long…",
		);
	});
	await it("should not truncate if maxLength is greater than text length", () => {
		strictEqual(truncateText("Short text", 50), "Short text");
	});
	await it("should not truncate if maxLength is equal to text length", () => {
		strictEqual(truncateText("Short text", 10), "Short text");
	});
	await it("should split at newlines", () => {
		strictEqual(truncateText("First line\nSecond line", 25), "First line…");
	});
	await it("should not split at newlines with multiline on", () => {
		strictEqual(truncateText("First line\nSecond line", 25, true), "First line\nSecond line");
	});
	await it("should count the …", () => {
		strictEqual(truncateText("foobar", 4), "foo…");
	});
});

await describe("caesar", async () => {
	await it("should handle empty string input", () => {
		strictEqual(caesar(""), "");
	});
	await it("should basically rotate correctly", () => {
		strictEqual(caesar("hello"), "uryyb");
	});
	await it("should handle rotation with a custom rotation", () => {
		strictEqual(caesar("hello", 3), "khoor");
	});
	await it("should handle rotation with negative rotation", () => {
		strictEqual(caesar("khoor", -3), "hello");
	});
	await it("should handle rotation around the alphabet", () => {
		strictEqual(caesar("zebra", 1), "afcsb");
	});
	await it("should handle mixed case input", () => {
		strictEqual(caesar("AbCdEf", 2), "CdEfGh");
	});
	await it("should ignore non-alphabetic characters", () => {
		strictEqual(caesar("Hello, World 10!", 5), "Mjqqt, Btwqi 10!");
	});
	await it("should handle large rotations", () => {
		strictEqual(caesar("Hello", 26), "Hello");
	});
});

await describe("normalize", async () => {
	await it("should remove diacritics", () => {
		strictEqual(normalize("Café"), "Cafe");
	});
	await it("should condense whitespace", () => {
		strictEqual(normalize("  This  is\t a\n test  \rstring. "), " This is a\n test \nstring. ");
	});
	await it("should normalize line endings", () => {
		strictEqual(
			normalize("Line 1\r\nLine 2\nLine 3\rLine 4"),
			"Line 1\nLine 2\nLine 3\nLine 4",
		);
	});
	await it("should ignore empty input", () => {
		strictEqual(normalize(""), "");
	});
	await it("should ignore normal text", () => {
		strictEqual(normalize("This is a test string."), "This is a test string.");
	});
});

await describe("trimPatchVersion", async () => {
	await it("should trim the patch version", () => {
		strictEqual(trimPatchVersion("1.0.0"), "1.0");
	});
	await it("should trim multiple patch versions", () => {
		strictEqual(trimPatchVersion("1.0.0"), "1.0");
	});
	await it("should ignore versions without a patch", () => {
		strictEqual(trimPatchVersion("1.0"), "1.0");
	});
	await it("should ignore invalid versions", () => {
		strictEqual(trimPatchVersion("1.0"), "1.0");
	});
});
