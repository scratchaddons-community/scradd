import path from "node:path";
import { fileURLToPath } from "node:url";

import js from "@eslint/js";
import unicorn from "eslint-plugin-unicorn";
import globals from "globals";
import typescriptEslint from "typescript-eslint";

const config = typescriptEslint.config(
	{ files: ["**/*.ts"] },
	{ ignores: ["./dist"] },
	js.configs.recommended,
	...typescriptEslint.configs.all,
	unicorn.configs["flat/all"],
	{
		languageOptions: {
			ecmaVersion: 2025,
			globals: globals.nodeBuiltin,
			parserOptions: {
				projectService: true,
				tsconfigRootDir: path.dirname(fileURLToPath(import.meta.url)),
			},
		},
		linterOptions: { reportUnusedDisableDirectives: "error" },
		rules: {
			"@typescript-eslint/consistent-return": "off",
			"@typescript-eslint/consistent-type-definitions": ["error", "type"],
			"@typescript-eslint/explicit-function-return-type": [
				"error",
				{
					allowConciseArrowFunctionExpressionsStartingWithVoid: true,
					allowExpressions: true,
					allowIIFEs: true,
				},
			],
			"@typescript-eslint/explicit-member-accessibility": [
				"error",
				{ accessibility: "no-public", overrides: { parameterProperties: "explicit" } },
			],
			"@typescript-eslint/init-declarations": "off",
			"@typescript-eslint/max-params": ["warn", { max: 4 }],
			"@typescript-eslint/member-ordering": "off",
			"@typescript-eslint/method-signature-style": ["error", "method"],
			"@typescript-eslint/naming-convention": [
				// TODO: look into different types
				"error",
				{
					custom: { match: false, regex: /\d/u.source },
					format: ["camelCase", "UPPER_CASE", "PascalCase"],
					selector: ["variable", "import"],
				},
				{
					custom: { match: false, regex: /\d/u.source },
					format: ["camelCase"],
					selector: ["function", "method", "parameterProperty"],
				},
				{
					custom: { match: false, regex: /\d/u.source },
					filter: { match: false, regex: /^_+$/u.source },
					format: ["camelCase"],
					selector: "parameter",
				},
				{
					custom: { match: false, regex: /\d/u.source },
					format: ["camelCase", "UPPER_CASE"],
					selector: "classProperty",
				},
				{
					custom: { match: false, regex: /\d/u.source },
					format: ["PascalCase"],
					selector: ["typeLike", "enumMember"],
				},
			],
			"@typescript-eslint/no-deprecated": "warn",
			"@typescript-eslint/no-floating-promises": ["error", { checkThenables: true }],
			"@typescript-eslint/no-magic-numbers": [
				"off", // TODO
				{
					enforceConst: true,
					ignore: [-1, 0, 0.5, 1, 2, 3, 5, 10, 16, 100, 1000, 1005, 1024],
					ignoreArrayIndexes: true,
					// ignoreClassFieldInitialValues: true,
					// ignoreDefaultValues: true,
					// ignoreEnums: true,
					ignoreNumericLiteralTypes: true,
					// ignoreReadonlyClassProperties: true,
					ignoreTypeIndexes: true,
				},
			],
			"@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: false }],
			"@typescript-eslint/no-shadow": [
				"error",
				{ builtinGlobals: true, ignoreOnInitialization: true },
			],
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-type-assertion": "warn",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ args: "all", argsIgnorePattern: /^_+$/u.source, reportUsedIgnorePattern: true },
			],
			"@typescript-eslint/no-use-before-define": "off",
			"@typescript-eslint/parameter-properties": ["error", { prefer: "parameter-property" }],
			"@typescript-eslint/prefer-enum-initializers": "off",
			"@typescript-eslint/prefer-nullish-coalescing": [
				"error",
				{ ignoreMixedLogicalExpressions: true, ignorePrimitives: true },
			],
			"@typescript-eslint/prefer-readonly-parameter-types": "off",
			"@typescript-eslint/promise-function-async": "off",
			"@typescript-eslint/restrict-template-expressions": [
				"error",
				{ allowAny: false, allowBoolean: false, allowNullish: false, allowRegExp: false },
			],
			"@typescript-eslint/return-await": ["error", "always"],
			"@typescript-eslint/strict-boolean-expressions": "off",
			"@typescript-eslint/switch-exhaustiveness-check": [
				"error",
				{
					allowDefaultCaseForExhaustiveSwitch: false,
					considerDefaultExhaustiveForUnions: true,
				},
			],
			"@typescript-eslint/typedef": "off",
			"@typescript-eslint/use-unknown-in-catch-callback-variable": "off",
			"capitalized-comments": "off",
			"line-comment-position": "off",
			"max-depth": "error",
			"multiline-comment-style": ["error", "separate-lines"],
			"no-fallthrough": [
				"error",
				{
					allowEmptyCase: true,
					commentPattern: /[Ff]alls?[ -]?through/u.source,
					reportUnusedFallthroughComment: true,
				},
			],
			"no-inline-comments": "off",
			"no-restricted-syntax": [
				"error",
				"CallExpression[callee.name='String']",
				"TSIndexSignature",
			],
			"no-sparse-arrays": "off",
			"no-warning-comments": ["warn", { location: "anywhere" }],
			"require-unicode-regexp": "off",
			//TODO: enable // "sort-imports": ["error", { allowSeparatedGroups: true, ignoreDeclarationSort: true }], // TODO: enable declaration sort when we can sort by source
			"unicorn/catch-error-name": ["error", { ignore: [/(?:E|^e)rror(?:[^a-z]|$)/u] }],
			"unicorn/consistent-destructuring": "off",
			"unicorn/explicit-length-check": "off",
			"unicorn/filename-case": ["error", { case: "kebabCase" }],
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
						sa: { scratchAddons: true },
						usr: { user: true },
					},
				},
			],
			"unicorn/relative-url-style": ["error", "always"],
			"unicorn/string-content": [
				"error",
				{
					patterns: {
						[/\.{3}/gu.source]: "…",
						[/"/gu.source]: { message: 'Prefer `“` or `”` over `"`.', suggest: '"' },
						[/'/gu.source]: "’",
						[/->/gu.source]: "→",
						[/\$\{/gu.source]: {
							message: "Did you mean to use a template literal?",
							suggest: "${",
						},
						[/!\?/gu.source]: "⁉",
						[/:_+:/gu.source]: ":emoji:",
					},
				},
			],
		},
	},
	{
		files: ["**/*.config.js"],
		rules: { "unicorn/prevent-abbreviations": "off", "unicorn/string-content": "off" },
	},
	{
		files: ["**/*.d.ts"],
		rules: {
			"@typescript-eslint/consistent-type-definitions": "off",
			"@typescript-eslint/naming-convention": "off",
			"@typescript-eslint/no-unused-vars": "off",
		},
	},
	{ files: ["./common/typedefs/**"], rules: { "unicorn/filename-case": "off" } },
	{
		files: [
			"./.private/**",
			"./modules/auto/secrets.ts",
			"./common/constants.ts",
			"./common/features.ts",
			"**/*.config.js",
		],
		rules: { "sort-keys": ["error", "asc", { caseSensitive: false, natural: true }] },
	},
	{
		files: ["*.test.ts", "*.test.js"],
		rules: { "@typescript-eslint/no-magic-numbers": "off" },
	},
);

export default config;

// todo: [..] over toJSON?
// todo: stop nesting why tf are there 11-level nesting places
