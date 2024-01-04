import { strictEqual } from "node:assert";
import { getXpForLevel, getLevelForXp } from "./misc.js";
import { describe, it } from "node:test";

await describe("getXpForLevel", async () => {
	await it("should return the needed XP to reach the given level", () => {
		strictEqual(getXpForLevel(1), 50);
		strictEqual(getXpForLevel(5), 1000);
		strictEqual(getXpForLevel(10), 4000);
		strictEqual(getXpForLevel(88), 605_000);
	});
	await it("should handle levels greater than the highest level in XP_PER_LEVEL", () => {
		strictEqual(getXpForLevel(89), 620_000);
		strictEqual(getXpForLevel(90), 640_000);
		strictEqual(getXpForLevel(91), 660_000);
		strictEqual(getXpForLevel(100), 845_000);
	});
});

await describe("getLevelForXp", async () => {
	await it("should return the corresponding level for a given XP value", () => {
		strictEqual(getLevelForXp(500), 4);
		strictEqual(getLevelForXp(1500), 6);
		strictEqual(getLevelForXp(6000), 12);
	});
	await it("should return the previous level for an unknown XP value", () => {
		strictEqual(getLevelForXp(499), 3);
		strictEqual(getLevelForXp(1), 0);
		strictEqual(getLevelForXp(605_001), 88);
	});
	await it("should calculate levels for high XP values", () => {
		strictEqual(getLevelForXp(640_000), 89);
		strictEqual(getLevelForXp(740_000), 95);
		strictEqual(getLevelForXp(845_000), 100);
	});
	await it("should find levels for unknown high XP values", () => {
		strictEqual(getLevelForXp(640_100), 89);
		strictEqual(getLevelForXp(740_100), 95);
		strictEqual(getLevelForXp(844_900), 99);
	});
});
