"use strict";

const { compilerOptions } = require("./tsconfig.json");

/** @type {import("eslint").ESLint.ConfigData} */
module.exports = {
	env: Object.fromEntries(
		[...compilerOptions.lib, ...compilerOptions.types, compilerOptions.target]
			.map((library) => /** @type {const} */ ([library.toLowerCase(), true]))
			.filter(
				([library]) =>
					(library.length === 4 && library.startsWith("es")) ||
					compilerOptions.types.includes(library),
			),
	),
	extends: ["eslint:recommended", "plugin:unicorn/all", "plugin:@typescript-eslint/all"],
	ignorePatterns: "dist",
	overrides: [
		{
			files: "*.cjs",
			parserOptions: { sourceType: "script" },
			rules: {
				"@typescript-eslint/no-require-imports": "off",
				"@typescript-eslint/no-var-requires": "off",
			},
		},
		{
			files: ".*",
			rules: { "unicorn/prevent-abbreviations": "off", "unicorn/string-content": "off" },
		},
		{
			files: "*.d.ts",
			rules: {
				"@typescript-eslint/consistent-type-definitions": "off",
				"@typescript-eslint/naming-convention": "off",
				"@typescript-eslint/no-unused-vars": "off",
			},
		},
		{
			files: [
				"modules/_private/**",
				"modules/auto/secrets.ts",
				"common/constants.ts",
				".eslintrc.cjs",
			],
			rules: { "sort-keys": ["error", "asc", { caseSensitive: false, natural: true }] },
		},
		{
			files: ["*.test.ts", "*.test.js"],
			rules: { "@typescript-eslint/no-magic-numbers": "off" },
		},
	],
	parser: "@typescript-eslint/parser",
	parserOptions: { project: true, sourceType: "module", tsconfigRootDir: __dirname },
	plugins: ["@typescript-eslint"],
	reportUnusedDisableDirectives: true,
	root: true,
	rules: {
		"@typescript-eslint/consistent-type-definitions": ["error", "type"],
		"@typescript-eslint/consistent-type-imports": [
			"error",
			{ fixStyle: "inline-type-imports" },
		],
		"@typescript-eslint/explicit-function-return-type": "off",
		"@typescript-eslint/explicit-member-accessibility": [
			"error",
			{ accessibility: "no-public", overrides: { parameterProperties: "explicit" } },
		],
		"@typescript-eslint/explicit-module-boundary-types": "off",
		"@typescript-eslint/init-declarations": "off",
		"@typescript-eslint/max-params": ["warn", { max: 4 }],
		"@typescript-eslint/member-ordering": "off",
		"@typescript-eslint/method-signature-style": ["error", "method"],
		"@typescript-eslint/naming-convention": [
			// TODO: look into different types
			"error",
			{
				custom: { match: false, regex: /\d/.source },
				format: ["camelCase", "UPPER_CASE", "PascalCase"],
				selector: ["variable", "import"],
			},
			{
				custom: { match: false, regex: /\d/.source },
				format: ["camelCase"],
				selector: ["function", "method", "parameterProperty"],
			},
			{
				custom: { match: false, regex: /\d/.source },
				filter: { match: false, regex: /^_$/.source },
				format: ["camelCase"],
				selector: "parameter",
			},
			{
				custom: { match: false, regex: /\d/.source },
				format: ["camelCase", "UPPER_CASE"],
				selector: "classProperty",
			},
			{
				custom: { match: false, regex: /\d/.source },
				format: ["PascalCase"],
				selector: ["typeLike", "enumMember"],
			},
		],
		"@typescript-eslint/no-magic-numbers": [
			"off", // TODO: enable
			{
				ignore: [-2, -1, 0, 0.5, 1, 2, 3, 4, 5, 10, 100],
				ignoreArrayIndexes: true,
				ignoreClassFieldInitialValues: true,
				ignoreDefaultValues: true,
				ignoreEnums: true,
				ignoreNumericLiteralTypes: true,
				ignoreReadonlyClassProperties: true,
				ignoreTypeIndexes: true,
			},
		],
		"@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: false }],
		"@typescript-eslint/no-shadow": [
			"warn",
			{ builtinGlobals: true, ignoreOnInitialization: true },
		],
		"@typescript-eslint/no-unsafe-member-access": "off",
		"@typescript-eslint/no-unused-vars": [
			"error",
			{ args: "all", argsIgnorePattern: /^_+$/.source, caughtErrors: "all" },
		],
		"@typescript-eslint/no-use-before-define": "off",
		"@typescript-eslint/parameter-properties": ["error", { prefer: "parameter-property" }],
		"@typescript-eslint/prefer-enum-initializers": "off",
		"@typescript-eslint/prefer-nullish-coalescing": "off",
		"@typescript-eslint/prefer-readonly-parameter-types": "off",
		"@typescript-eslint/promise-function-async": "off",
		"@typescript-eslint/restrict-template-expressions": [
			"error",
			{ allowAny: false, allowBoolean: false, allowNullish: false, allowRegExp: false },
		],
		"@typescript-eslint/return-await": ["error", "always"],
		"@typescript-eslint/strict-boolean-expressions": "off",
		"@typescript-eslint/switch-exhaustiveness-check": [
			"warn", // TODO: change to error after https://github.com/typescript-eslint/typescript-eslint/issues/6682 is fixed
			{ allowDefaultCaseForExhaustiveSwitch: false },
		],
		"@typescript-eslint/typedef": "off",
		"capitalized-comments": "off",
		"line-comment-position": "off",
		"max-depth": "error",
		//TODO: enable // "multiline-comment-style": ["error", "separate-lines"],
		"no-fallthrough": [
			"error",
			{ allowEmptyCase: true, commentPattern: /[Ff]alls?[ -]?through/.source },
		],
		"no-inline-comments": "off",
		"no-mixed-spaces-and-tabs": "off",
		"no-restricted-syntax": [
			"error",
			"CallExpression[callee.name='String']",
			"TSIndexSignature",
		],
		"no-sparse-arrays": "off",
		"no-warning-comments": ["warn", { location: "anywhere" }],
		"require-unicode-regexp": "off",
		//TODO: enable // "sort-imports": ["error", { allowSeparatedGroups: true, ignoreDeclarationSort: true }], // TODO: enable declaration sort when we can sort by source
		"unicorn/catch-error-name": ["error", { ignore: [/(?:E|^e)rror(?:[^a-z]|$)/] }],
		"unicorn/consistent-destructuring": "off",
		"unicorn/explicit-length-check": "off",
		"unicorn/filename-case": ["error", { case: "camelCase" }],
		"unicorn/no-array-callback-reference": "off",
		"unicorn/no-array-reduce": "off",
		"unicorn/no-await-expression-member": "off",
		"unicorn/no-keyword-prefix": "off",
		"unicorn/no-nested-ternary": "off",
		"unicorn/no-null": "off",
		"unicorn/no-process-exit": "off",
		"unicorn/no-unreadable-array-destructuring": "off",
		"unicorn/number-literal-case": "off",
		"unicorn/prevent-abbreviations": [
			"warn",
			{
				checkDefaultAndNamespaceImports: true,
				checkShorthandImports: true,
				checkShorthandProperties: true,
				replacements: {
					arg: false,
					args: false,
					attr: false,
					attrs: false,
					cmd: { command: true },
					dev: false,
					dist: false,
					docs: false,
					dst: false,
					env: false,
					envs: false,
					func: false,
					function: { func: true },
					mod: false,
					pkg: false,
					prod: false,
					res: false,
					usr: { user: true },
				},
			},
		],
		"unicorn/relative-url-style": ["error", "always"],
		"unicorn/string-content": [
			"warn",
			{
				patterns: {
					[/\.{3}/.source]: "…",
					[/"/.source]: { message: 'Prefer `“` or `”` over `"`.', suggest: '"' },
					[/'/.source]: "’",
					[/->/.source]: "→",
					[/!\?/.source]: "⁉",
				},
			},
		],
	},
};

// todo: [..] over toJSON?
// todo: stop nesting why tf are there 14-level nesting places
// todo: unicorn/prefer-spread with objects
