import { deepStrictEqual, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { anyPromise, asyncFilter } from "./promises.js";

await describe("asyncFilter", async () => {
	await it("should filter elements of array based on predicate", async () => {
		const filteredArray = [];

		for await (const value of asyncFilter(
			[1, 2, 3, 4, 5],
			async (value) => (await Promise.resolve(value % 2 === 0)) && value,
		)) {
			filteredArray.push(value);
		}

		deepStrictEqual(filteredArray, [2, 4]);
	});

	await it("should handle an empty array", async () => {
		const filteredArray = [];

		for await (const value of asyncFilter(
			[],
			async (value) => (await Promise.resolve(value % 2 === 0)) && value,
		)) {
			filteredArray.push(value);
		}

		deepStrictEqual(filteredArray, []);
	});
});

await describe("anyPromise", async () => {
	await it("should return true if any promise is truey", async () => {
		strictEqual(
			await anyPromise([
				Promise.resolve(false),
				Promise.resolve(0),
				Promise.resolve(),
				Promise.resolve(true),
				Promise.resolve(1),
				Promise.resolve("value"),
			]),
			true,
		);
	});
	await it("should return true if one promise is truey", async () => {
		strictEqual(
			await anyPromise([Promise.resolve(false), Promise.resolve(0), Promise.resolve(true)]),
			true,
		);
	});

	await it("should return false if all promises are falsey", async () => {
		strictEqual(
			await anyPromise([Promise.resolve(false), Promise.resolve(0), Promise.resolve()]),
			false,
		);
	});
	await it("should handle one truey promise", async () => {
		strictEqual(await anyPromise([Promise.resolve(true)]), true);
	});
	await it("should handle an empty array of promises", async () => {
		strictEqual(await anyPromise([]), false);
	});
});
