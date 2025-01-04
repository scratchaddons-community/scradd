import { strictEqual } from "node:assert";
import { describe, it } from "node:test";

import { formatDuration } from "./numbers.ts";

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
