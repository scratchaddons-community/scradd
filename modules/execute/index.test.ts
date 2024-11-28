import type { ApplicationCommandOption } from "discord.js";

import { deepStrictEqual, strictEqual } from "node:assert";
import { describe, it } from "node:test";

import { ApplicationCommandOptionType } from "discord.js";

import { parseArgument, parseArguments, partitionArguments, splitFirstArgument } from "./misc.ts";

await describe("splitFirstArgument", async () => {
	await it("should remove the first argument", () => {
		deepStrictEqual(splitFirstArgument("foo bar baz"), ["foo", "bar baz"]);
	});
	await it("should not collapse spaces", () => {
		deepStrictEqual(splitFirstArgument("a          n ei   reig  wof"), [
			"a",
			"n ei   reig  wof",
		]);
	});
	await it("should handle a lack of options", () => {
		deepStrictEqual(splitFirstArgument("foobar"), ["foobar", ""]);
	});
	await it("should lowercase the subcommand", () => {
		deepStrictEqual(splitFirstArgument("Foobar"), ["foobar", ""]);
	});
});

await describe("parseArguments", async () => {
	await it("should parse options correctly according to the schema", async () => {
		deepStrictEqual(
			await parseArguments("John 25", [
				{ name: "name", description: "", type: ApplicationCommandOptionType.String },
				{ name: "age", description: "", type: ApplicationCommandOptionType.Number },
			]),
			{ name: "John", age: 25 },
		);
	});
	await it("should allow passing over optional arguments", async () => {
		deepStrictEqual(
			await parseArguments("", [
				{
					name: "name",
					description: "",
					required: false,
					type: ApplicationCommandOptionType.String,
				},
				{
					name: "age",
					description: "",
					required: false,
					type: ApplicationCommandOptionType.Number,
				},
			]),
			{ age: undefined, name: undefined },
		);
	});
	await it("should return an empty object for an empty schema", async () => {
		deepStrictEqual(await parseArguments("John 25", []), {});
	});
	await it("should properly parse subcommands", async () => {
		deepStrictEqual(
			await parseArguments("foo", [
				{ name: "foo", description: "", type: ApplicationCommandOptionType.Subcommand },
				{ name: "bar", description: "", type: ApplicationCommandOptionType.Subcommand },
			]),
			{ subcommand: "foo", options: {} },
		);
	});
	await it("should properly parse subcommands with options", async () => {
		deepStrictEqual(
			await parseArguments("foo pog", [
				{
					name: "foo",
					description: "",
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{ name: "a", description: "", type: ApplicationCommandOptionType.String },
					],
				},
				{
					name: "bar",
					description: "",
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{ name: "a", description: "", type: ApplicationCommandOptionType.String },
					],
				},
			]),
			{ subcommand: "foo", options: { a: "pog" } },
		);
	});
	await it("should return true on disallowed subcommands", async () => {
		strictEqual(
			await parseArguments(
				"foo",
				[
					{ name: "foo", description: "", type: ApplicationCommandOptionType.Subcommand },
					{ name: "bar", description: "", type: ApplicationCommandOptionType.Subcommand },
				],
				false,
			),
			true,
		);
	});
});

await describe("parseArgument", async () => {
	await it("should parse string options correctly", async () => {
		strictEqual(
			await parseArgument("John", {
				name: "name",
				description: "",
				type: ApplicationCommandOptionType.String,
			}),
			"John",
		);
		deepStrictEqual(
			await parseArgument(undefined, {
				name: "name",
				description: "",
				required: true,
				type: ApplicationCommandOptionType.String,
			}),
			{ error: false },
		);
		strictEqual(
			await parseArgument(undefined, {
				name: "name",
				description: "",
				required: false,
				type: ApplicationCommandOptionType.String,
			}),
			undefined,
		);
	});
	await it("should parse boolean options correctly", async () => {
		strictEqual(
			await parseArgument("true", {
				name: "active",
				description: "",
				type: ApplicationCommandOptionType.Boolean,
			}),
			true,
		);
		deepStrictEqual(
			await parseArgument("foobar", {
				name: "active",
				description: "",
				required: true,
				type: ApplicationCommandOptionType.Boolean,
			}),
			{ error: false },
		);
	});
	await it("should parse number options correctly", async () => {
		strictEqual(
			await parseArgument("25.123", {
				name: "age",
				description: "",
				type: ApplicationCommandOptionType.Number,
			}),
			25.123,
		);
		deepStrictEqual(
			await parseArgument("foobar", {
				name: "age",
				description: "",
				required: true,
				type: ApplicationCommandOptionType.Number,
			}),
			{ error: false },
		);
	});
	await it("should parse integer options correctly", async () => {
		strictEqual(
			await parseArgument("25.123", {
				name: "age",
				description: "",
				type: ApplicationCommandOptionType.Integer,
			}),
			25,
		);
		deepStrictEqual(
			await parseArgument("foobar", {
				name: "age",
				description: "",
				required: true,
				type: ApplicationCommandOptionType.Integer,
			}),
			{ error: false },
		);
	});
});

await describe("partitionArguments", async () => {
	const schema = Array.from<unknown, ApplicationCommandOption>({ length: 6 }, () => ({
		name: "foo",
		description: "",
		type: ApplicationCommandOptionType.Boolean,
	}));
	await it("should split on every space", () => {
		deepStrictEqual(partitionArguments("a b c d e f", schema), ["a", "b", "c", "d", "e", "f"]);
	});
	if (schema[4]) schema[4].type = ApplicationCommandOptionType.String;
	await it("should make strings greedy", () => {
		deepStrictEqual(partitionArguments("a b c d e f g h i j", schema), [
			"a",
			"b",
			"c",
			"d",
			"e f g h i",
			"j",
		]);
	});
	await it("should ignore double spaces between items", () => {
		deepStrictEqual(partitionArguments("a  b c d e f g h i j", schema), [
			"a",
			"b",
			"c",
			"d",
			"e f g h i",
			"j",
		]);
	});
	await it("should ignore new lines between items", () => {
		deepStrictEqual(partitionArguments("a b\nc d e f g h i j", schema), [
			"a",
			"b",
			"c",
			"d",
			"e f g h i",
			"j",
		]);
	});
	await it("should not ignore double spaces in greedy items", () => {
		deepStrictEqual(partitionArguments("a b c d e f  g h i j", schema), [
			"a",
			"b",
			"c",
			"d",
			"e f  g h i",
			"j",
		]);
	});
	await it("should not ignore newlines in greedy items", () => {
		deepStrictEqual(partitionArguments("a b c d e\nf g h i j", schema), [
			"a",
			"b",
			"c",
			"d",
			"e\nf g h i",
			"j",
		]);
	});
	await it("should work with a variety of simultaneous edge cases", () => {
		deepStrictEqual(partitionArguments("a  b\nc d e\nf  g h i j", schema), [
			"a",
			"b",
			"c",
			"d",
			"e\nf  g h i",
			"j",
		]);
	});
});
