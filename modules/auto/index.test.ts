import { deepStrictEqual, notEqual, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { getMatches, handleMatch, htmlToMarkdown, linkifyMentions } from "./scratch.js";

await describe("getMatches", async () => {
	await it("should match lone links", () => {
		deepStrictEqual(getMatches("https://scratch.mit.edu/users/RedGuy7"), [
			"https://scratch.mit.edu/users/RedGuy7",
		]);
	});
	await it("should match not-lone links", () => {
		deepStrictEqual(getMatches("foo https://scratch.mit.edu/users/RedGuy7 bar"), [
			" https://scratch.mit.edu/users/RedGuy7 ",
		]);
	});
	await it("should match multiple links", () => {
		deepStrictEqual(
			getMatches(
				"https://scratch.mit.edu/users/RedGuy7 https://scratch.mit.edu/users/RedGuy12",
			),
			["https://scratch.mit.edu/users/RedGuy7 ", "https://scratch.mit.edu/users/RedGuy12"],
		);
	});
	await it("should only match the first 5 links", () => {
		deepStrictEqual(
			getMatches(
				"https://scratch.mit.edu/users/RedGuy7 https://scratch.mit.edu/users/RedGuy12 https://scratch.mit.edu/users/raisinr https://scratch.mit.edu/users/RaisinrPP https://scratch.mit.edu/projects/104 https://scratch.mit.edu/users/World_Languages",
			),
			[
				"https://scratch.mit.edu/users/RedGuy7 ",
				"https://scratch.mit.edu/users/RedGuy12 ",
				"https://scratch.mit.edu/users/raisinr ",
				"https://scratch.mit.edu/users/RaisinrPP ",
				"https://scratch.mit.edu/projects/104 ",
			],
		);
	});
});
await describe("handleMatch", async () => {
	await it("should ignore when surrounded in angles", async () => {
		strictEqual(await handleMatch("<https://scratch.mit.edu/users/RedGuy7>"), undefined);
	});
	await it("should not ignore a user with one left angle", async () => {
		notEqual(await handleMatch("<https://scratch.mit.edu/users/RedGuy7|"), undefined);
	});
	await it("should not ignore a studio with one right angle", async () => {
		notEqual(await handleMatch("|https://scratch.mit.edu/studios/386359>"), undefined);
	});
	await it("should not ignore a discussion with no angles", async () => {
		notEqual(await handleMatch("|https://scratch.mit.edu/discuss/topic/732678|"), undefined);
	});
	await it("should work for projects", async () => {
		notEqual(await handleMatch("|https://scratch.mit.edu/projects/890809667|"), undefined);
	});
});
await describe("htmlToMarkdown", async () => {
	await it("should convert HTML to Markdown", () => {
		strictEqual(
			htmlToMarkdown(
				// eslint-disable-next-line unicorn/string-content
				'<blockquote>Chill = <a href="https://freemusicarchive.org/music/Chris_Zabriskie/Vendaface/05_-_Air_Hockey_Saloon">Air Hockey Salon</a> by Chris Zabriskie (CC-BY)<br>Bossa Nova = <a href="https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1600055">BossaBossa</a> by Kevin MacLeod (CC-BY)<br></blockquote>Source: <a href="https://github.com/LLK/scratch-gui/pull/3385">https://github.com/LLK/scratch-gui/pull/3385</a>',
			),
			"\n> Chill = [Air Hockey Salon](https://freemusicarchive.org/music/Chris_Zabriskie/Vendaface/05_-_Air_Hockey_Saloon) by Chris Zabriskie (CC-BY)\n> Bossa Nova = [BossaBossa](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1600055) by Kevin MacLeod (CC-BY)\nSource: [https://github.com/LLK/scratch-gui/pull/3385](https://github.com/LLK/scratch-gui/pull/3385)",
		);
	});
});

await describe("linkifyMentions", async () => {
	await it("should linkify lone mentions", () => {
		strictEqual(
			linkifyMentions("@RedGuy7"),
			"[@RedGuy7](https://scratch.mit.edu/users/RedGuy7)",
		);
	});
	await it("should linkify non-lone mentions", () => {
		strictEqual(
			linkifyMentions("foo @RedGuy7 bar"),
			"foo [@RedGuy7](https://scratch.mit.edu/users/RedGuy7) bar",
		);
	});
});
