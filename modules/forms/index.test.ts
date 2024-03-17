import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import generateAppeal, { getAppealComponents, parseIds } from "./appeals/generate-appeal.js";

await describe("generateAppeal", async () => {
	await it("should generate blank appeals", () => {
		deepStrictEqual(
			generateAppeal({}, {}, { accepters: new Set(), rejecters: new Set() }).embeds,
			[
				{},
				{
					title: "Pending",
					fields: [
						{ name: "Accepters", value: "Nobody", inline: true },
						{ name: "Rejecters", value: "Nobody", inline: true },
						{ name: "\u200B", value: "\u200B", inline: true },
						{ name: "Accepted Note", value: "N/A", inline: true },
						{ name: "Rejected Note", value: "N/A", inline: true },
					],
				},
			],
		);
	});
	await it("should generate accepted appeals", () => {
		const [, embed] =
			generateAppeal(
				{},
				{ accepted: "Note for accept" },
				{
					accepters: new Set(["771422735486156811", "1084118992735719507"]),
					rejecters: new Set(),
				},
			).embeds ?? [];
		ok(embed);
		ok("title" in embed);
		strictEqual(embed.title, "Accepted");
	});
	await it("should generate rejected appeals", () => {
		const [, embed] =
			generateAppeal(
				{},
				{ rejected: "Note for reject" },
				{ accepters: new Set(), rejecters: new Set(["700822091649515530"]) },
			).embeds ?? [];
		ok(embed);
		ok("title" in embed);
		strictEqual(embed.title, "Rejected");
	});
});

await describe("parseIds", async () => {
	await it("should correctly parse accepters and rejecters", () => {
		const result = parseIds("GwhF4BVLLz+FKJqN9;Q36|J]gNVGAH0G+Njx-7EaP=M");
		deepStrictEqual(result.accepters, new Set(["771422735486156811", "700822091649515530"]));
		deepStrictEqual(result.rejecters, new Set(["914126244407296020", "1084118992735719507"]));
	});

	await it("should ignore `0`s", () => {
		const result = parseIds("GwhF4BVLLz+0|J]gNVGAH0G+0");
		deepStrictEqual(result.accepters, new Set(["771422735486156811"]));
		deepStrictEqual(result.rejecters, new Set(["914126244407296020"]));
	});
});

await describe("getAppealComponents", async () => {
	await it("should generate correct component `customId`s", () => {
		strictEqual(
			getAppealComponents({
				accepters: new Set(["914126244407296020", "700822091649515530"]),
				rejecters: new Set(),
			}).components[0].customId,
			"J]gNVGAH0G+FKJqN9;Q36|_acceptAppeal",
		);
	});

	await it("should disable buttons when resolved", () => {
		const resolved = getAppealComponents({
			accepters: new Set(["771422735486156811", "914126244407296020"]),
			rejecters: new Set(["914126244407296020"]),
		});
		strictEqual(resolved.components[0].disabled, true);
		strictEqual(resolved.components[1].disabled, true);
	});
	await it("should not disable buttons when unresolved", () => {
		const unresolved = getAppealComponents({
			accepters: new Set(["700822091649515530"]),
			rejecters: new Set([]),
		});
		strictEqual(unresolved.components[0].disabled, false);
		strictEqual(unresolved.components[1].disabled, false);
	});
});
