import { strictEqual } from "node:assert";
import { describe, it } from "node:test";

import { truncateText } from "./text.ts";

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
