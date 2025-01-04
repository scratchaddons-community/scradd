import { strictEqual } from "node:assert";
import { describe, it } from "node:test";

import addons from "@sa-community/addons-data" with { type: "json" };
import { matchSorter } from "match-sorter";

import { addonSearchOptions } from "./index.ts";

await describe("addonSearchOptions", async () => {
	await it("should match on addon ID", () => {
		strictEqual(
			matchSorter(addons, "editor-theme3", addonSearchOptions)[0]?.addonId,
			"editor-theme3",
		);
	});
	await it("should search addon ID", () => {
		strictEqual(matchSorter(addons, "theme3", addonSearchOptions)[0]?.addonId, "editor-theme3");
	});
	await it("should search addon name", () => {
		strictEqual(
			matchSorter(addons, "website dark mode", addonSearchOptions)[0]?.addonId,
			"dark-www",
		);
	});
	await it("should search addon description", () => {
		strictEqual(
			matchSorter(addons, "scratch.mit.edu", addonSearchOptions)[0]?.addonId,
			"more-links",
		);
	});
	await it("should search addon setting names", () => {
		strictEqual(
			matchSorter(addons, "maximum number of lines", addonSearchOptions)[0]?.addonId,
			"comments-linebreaks",
		);
	});
	await it("should search addon preset names", () => {
		strictEqual(
			matchSorter(addons, "Old light green", addonSearchOptions)[0]?.addonId,
			"msg-count-badge",
		);
	});
	await it("should search addon preset descriptions", () => {
		strictEqual(
			matchSorter(addons, "original Scratch Messaging", addonSearchOptions)[0]?.addonId,
			"msg-count-badge",
		);
	});
});
