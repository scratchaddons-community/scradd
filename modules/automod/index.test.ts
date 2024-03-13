import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import tryCensor, { censor, isPingable } from "./misc.js";

await describe("tryCensor", async () => {
	await it("should not catch fine words", () => {
		strictEqual(tryCensor("foo"), false);
	});
	await it("should catch bad words", () => {
		deepStrictEqual(tryCensor("automodmute"), {
			censored: "a##########",
			strikes: 1,
			words: [[], ["automodmute"], []],
		});
	});
	await it("should not catch words starting with dashes", () => {
		strictEqual(tryCensor("-utomodmute"), false);
	});
	await it("should not catch words ending with dashes", () => {
		strictEqual(tryCensor("automodmut-"), false);
	});
	await it("should not catch words surrounded with dashes", () => {
		strictEqual(tryCensor("-utomodmute-"), false);
	});
	await it("should not censor fonts", () => {
		strictEqual(tryCensor("𝐌𝐢𝐧𝐭 𝐝𝐚𝐲 𝐢𝐧𝐟𝐨"), false);
	});
	await it("should censor emojis", () => {
		ok(tryCensor("🅰🇺✝🅾🇲⭕🇩Ⓜ🇺✝📧"));
		ok(tryCensor("🇦🇺🇹🇴🇲🇴🇩🇲🇺🇹🇪"));
	});
});
await describe("censor", async () => {
	await it("should not censor fine words", () => {
		strictEqual(censor("foo"), "foo");
	});
	await it("should censor bad words", () => {
		strictEqual(censor("automodmute"), "a##########");
	});
	await it("should censor attempted evades", () => {
		strictEqual(censor("aut0m0dmut3"), "a##########");
	});
	await it("should censor full evades", () => {
		strictEqual(censor("⒜⒰⒯⒪⒨⒪⒟⒨⒰⒯⒠"), "⒜##########");
	});
});

await describe("isPingable", async () => {
	await it("should block fancy fonts", () => {
		strictEqual(isPingable("⒜⒰⒯⒪⒨⒪⒟⒨⒰⒯⒠"), false);
	});
	await it("should block non-English", () => {
		strictEqual(isPingable("대니"), false);
	});
	await it("should block the third case", () => {
		strictEqual(isPingable("ſ"), false);
	});
	await it("should allow simple names", () => {
		strictEqual(isPingable("foo"), true);
	});
});
