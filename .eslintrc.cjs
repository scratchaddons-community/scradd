/** @file ESLint configuration file. */
"use strict";

require("@rushstack/eslint-patch/modern-module-resolution");

/** @type {import("eslint").Linter.Config} */
const config = {
	extends: ["@redguy12", "@redguy12/eslint-config/node"],

	overrides: [
		{ extends: "@redguy12/eslint-config/esm", files: "*.js" },
		{ files: "events/**.ts", rules: { "func-style": 0 } },
		{
			files: ["*.md/**", "*.json"],

			// Type information can't be obtained: see https://github.com/eslint/eslint-plugin-markdown/pull/155#issuecomment-671620312
			// So these rules must unfortunately be disabled.
			rules: { "etc/no-internal": 0 },
		},
		{
			files: "common/language.js",

			rules: {
				"@redguy12/no-character-class": 2,
				"regexp/prefer-character-class": 0,
				"unicorn/better-regex": 0,
			},
		},
	],

	parserOptions: { ecmaVersion: 2022, project: require.resolve("./tsconfig.json") },

	root: true,

	rules: {
		"@redguy12/file-comment-before-use-strict": 0,
		"jsdoc/require-file-overview": 0,
		"unicorn/no-null": 1,
		"etc/no-internal": [2, { ignored: { [/^Collection$/.source]: "name" } }],
		"@redguy12/no-js": 1,

		"id-match": [
			2,
			/^(?:[#_]?(?:(?:[A-Z]{2,}_){0,9}[A-Z]{2,}|(?:[A-Z](?:[a-z]|[A-Z])+|[a-z]{2,}){0,5})|icon_url)$/
				.source,
			{
				ignoreDestructuring: false,
				onlyDeclarations: false,
				properties: true,
			},
		],

		"sort-keys": 0,
	},
};

module.exports = config;
