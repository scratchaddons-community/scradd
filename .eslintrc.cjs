/** @file ESLint configuration file. */
"use strict";

require("@rushstack/eslint-patch/modern-module-resolution");

/** @type {import("eslint").Linter.Config} */
const config = {
	extends: ["@redguy12", "@redguy12/eslint-config/node"],

	overrides: [
		{
			extends: "@redguy12/eslint-config/esm",
			files: "*.js",
		},
		{
			files: "events/**.js",
			rules: { "func-style": 0 },
		},
	],

	parserOptions: { ecmaVersion: 2022, project: require.resolve("./tsconfig.json") },

	root: true,

	rules: {
		"@redguy12/file-comment-before-use-strict": 0,
		"jsdoc/require-file-overview": 0,
		"unicorn/no-null": 1,
		"etc/no-internal": [2, { ignored: { [/^Collection$/.source]: "name" } }],
	},
};

module.exports = config;
