import { strictEqual, deepStrictEqual } from "node:assert";
import { resolveIcon, parseColor } from "./misc.js";
import { describe, it } from "node:test";

await describe("resolveIcon", async () => {
	await it("should support Twemoji", async () => {
		deepStrictEqual(await resolveIcon("😀"), { unicodeEmoji: "😀" });
	});
	await it("should support data: URIs", async () => {
		deepStrictEqual(await resolveIcon("data:image/png;base64,iVBORw0KGg"), {
			icon: "data:image/png;base64,iVBORw0KGg",
		});
	});
	await it("should support external images", async () => {
		deepStrictEqual(
			await resolveIcon("https://uploads.scratch.mit.edu/users/avatars/55742784.png"),
			{
				icon: "https://uploads.scratch.mit.edu/users/avatars/55742784.png",
			},
		);
	});

	await it("should return undefined for arbitrary strings", async () => {
		strictEqual(await resolveIcon("invalid"), undefined);
		strictEqual(await resolveIcon("123"), undefined);
	});

	await it("should return undefined for invalid external images", async () => {
		strictEqual(await resolveIcon("https://paulsreid.com/invalidimage.jpg"), undefined);
		strictEqual(
			await resolveIcon(
				"https://upload.wikimedia.org/wikipedia/commons/d/dd/Vintage_car_meets_world_heritage_site.jpg",
			),
			undefined,
		);
	});
});

await describe("parseColor", async () => {
	await it("should support case-insensitive color presets", () => {
		strictEqual(parseColor("Red"), "Red");
		strictEqual(parseColor("red"), "Red");
		strictEqual(parseColor("reD"), "Red");
		strictEqual(parseColor("dark red"), "DarkRed");
		strictEqual(parseColor("random"), "Random");
	});
	await it("should support pound-insensitive hex codes", () => {
		strictEqual(parseColor("#000000"), "#000000");
		strictEqual(parseColor("ffffff"), "#ffffff");
	});
	await it("should support case-insensitive hex codes", () => {
		strictEqual(parseColor("fffFFF"), "#ffffff");
		strictEqual(parseColor("#fffFFF"), "#ffffff");
		strictEqual(parseColor("ffF"), "#ffffff");
		strictEqual(parseColor("#ffF"), "#ffffff");
	});
	await it("should support hex code shorthands", () => {
		strictEqual(parseColor("#000"), "#000000");
		strictEqual(parseColor("fff"), "#ffffff");
	});
	await it("should return undefined for invalid colors", () => {
		strictEqual(parseColor("invalid"), undefined);
		strictEqual(parseColor("abcd"), undefined);
		strictEqual(parseColor("#12"), undefined);
		strictEqual(parseColor("#12345"), undefined);
		strictEqual(parseColor("#1234567"), undefined);
	});
	await it("should ignore undefined colors", () => {
		const none = undefined;
		strictEqual(parseColor(none), undefined);
	});
});
