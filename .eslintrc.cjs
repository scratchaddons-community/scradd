/** @file ESLint configuration file. */
"use strict";

require("@rushstack/eslint-patch/modern-module-resolution");

/** @type {import("eslint").Linter.Config} */
const config = {
	extends: ["@redguy12", "@redguy12/eslint-config/node"],

	overrides: [
		{
			files: "!**.md/*",
			parserOptions: { project: require.resolve("./tsconfig.json"), ecmaVersion: 2022 },
		},
		{
			files: "!**.cjs/*",
			extends: "@redguy12/eslint-config/esm",
		},
	],

	root: true,
};

module.exports = config;
