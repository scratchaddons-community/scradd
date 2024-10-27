import { deepStrictEqual, strictEqual } from "node:assert";
import { describe, it } from "node:test";

import config from "../../common/config.js";
import github from "./github.js";
import { getMatches, htmlToMarkdown, linkifyMentions } from "./scratch.js";

await describe("github", async () => {
	await it("should support basic references", () => {
		strictEqual(github("#123"), "https://github.com/ScratchAddons/ScratchAddons/issues/123");
	});
	await it("should support preset repo shorthands", () => {
		strictEqual(github("site#123 "), "https://github.com/ScratchAddons/website-v2/issues/123");
	});
	await it("should support preset repo shorthands with orgs", () => {
		strictEqual(
			github("scradd#123 "),
			"https://github.com/scratchaddons-community/scradd/issues/123",
		);
	});
	await it("should support custom repos", () => {
		strictEqual(github("foobar#123 "), "https://github.com/ScratchAddons/foobar/issues/123");
	});
	await it("should support preset org shothands", () => {
		strictEqual(
			github("sacom/foobar#123"),
			"https://github.com/scratchaddons-community/foobar/issues/123",
		);
	});
	await it("should support custom orgs and repos", () => {
		strictEqual(github("foo/bar#123"), "https://github.com/foo/bar/issues/123");
	});
	await it("should default to Scradd repo in Scradd server", () => {
		strictEqual(
			github("#123", config.guilds.testing.id),
			"https://github.com/scratchaddons-community/scradd/issues/123",
		);
	});
	await it("should support preset repo shorthands in Scradd server", () => {
		strictEqual(
			github("site#123", config.guilds.testing.id),
			"https://github.com/ScratchAddons/website-v2/issues/123",
		);
	});
	await it("should support custom repos in Scradd server", () => {
		strictEqual(
			github("foobar#123", config.guilds.testing.id),
			"https://github.com/ScratchAddons/foobar/issues/123",
		);
	});
	await it("should support preset org shothands in Scradd server", () => {
		strictEqual(
			github("sa/foobar#123", config.guilds.testing.id),
			"https://github.com/ScratchAddons/foobar/issues/123",
		);
	});
	await it("should support custom orgs and repos in Scradd server", () => {
		strictEqual(
			github("foo/bar#123", config.guilds.testing.id),
			"https://github.com/foo/bar/issues/123",
		);
	});
	await it("should strip leading zeros", () => {
		strictEqual(github("#0123"), "https://github.com/ScratchAddons/ScratchAddons/issues/123");
	});
	await it("should ignore single digits", () => {
		strictEqual(github("#9"), "");
	});
	await it("should not ignore single digits with repos", () => {
		strictEqual(github("sa#9"), "https://github.com/ScratchAddons/ScratchAddons/issues/9");
	});
	await it("should ignore all zeros", () => {
		strictEqual(github("#0000"), "");
	});
	await it("should support multiple references", () => {
		strictEqual(
			github("#123 #124 #125"),
			"https://github.com/ScratchAddons/ScratchAddons/issues/123 https://github.com/ScratchAddons/ScratchAddons/issues/124 https://github.com/ScratchAddons/ScratchAddons/issues/125",
		);
	});
	await it("should ignore duplicate references", () => {
		strictEqual(
			github("#123 #124 #124"),
			"https://github.com/ScratchAddons/ScratchAddons/issues/123 https://github.com/ScratchAddons/ScratchAddons/issues/124",
		);
	});
});

await describe("getMatches", async () => {
	await it("should match lone links", () => {
		deepStrictEqual(getMatches("https://scratch.mit.edu/users/RedGuy7"), [
			new URL("https://scratch.mit.edu/users/RedGuy7"),
		]);
	});
	await it("should match not-lone links", () => {
		deepStrictEqual(getMatches("foo https://scratch.mit.edu/users/RedGuy7 bar"), [
			new URL("https://scratch.mit.edu/users/RedGuy7"),
		]);
	});
	await it("should match multiple links", () => {
		deepStrictEqual(
			getMatches(
				"https://scratch.mit.edu/users/RedGuy7 https://scratch.mit.edu/users/RedGuy12",
			),
			[
				new URL("https://scratch.mit.edu/users/RedGuy7"),
				new URL("https://scratch.mit.edu/users/RedGuy12"),
			],
		);
	});
	await it("should not match duplicate links", () => {
		deepStrictEqual(
			getMatches(
				"https://scratch.mit.edu/users/RedGuy7 https://scratch.mit.edu/users/RedGuy7",
			),
			[new URL("https://scratch.mit.edu/users/RedGuy7")],
		);
	});
	await it("should ignore when surrounded in angles", () => {
		deepStrictEqual(getMatches("<https://scratch.mit.edu/users/RedGuy7>"), []);
	});
	await it("should not ignore a user with one left angle", () => {
		deepStrictEqual(getMatches("<https://scratch.mit.edu/users/RedGuy7|"), [
			new URL("https://scratch.mit.edu/users/RedGuy7"),
		]);
	});
	await it("should not ignore a studio with one right angle", () => {
		deepStrictEqual(getMatches("|https://scratch.mit.edu/studios/386359>"), [
			new URL("https://scratch.mit.edu/studios/386359"),
		]);
	});
	await it("should not ignore a discussion with no angles", () => {
		deepStrictEqual(getMatches("|https://scratch.mit.edu/discuss/topic/732678|"), [
			new URL("https://scratch.mit.edu/discuss/topic/732678"),
		]);
	});
	await it("should work for projects", () => {
		deepStrictEqual(getMatches("|https://scratch.mit.edu/projects/890809667|"), [
			new URL("https://scratch.mit.edu/projects/890809667"),
		]);
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
