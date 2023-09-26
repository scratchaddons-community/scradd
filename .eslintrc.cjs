/** @type {import("eslint").ESLint.ConfigData} */
module.exports = {
	env: { es2021: true, node: true },
	extends: [
		"eslint:recommended",
		"plugin:unicorn/all",
		"plugin:@typescript-eslint/strict-type-checked",
	],
	ignorePatterns: "dist",
	overrides: [
		{
			extends: ["plugin:@typescript-eslint/disable-type-checked"],
			files: ".eslintrc.cjs",
			parserOptions: { project: false, sourceType: "script" },
			rules: {
				"sort-keys": ["error", "asc", { caseSensitive: false, natural: true }],
				"unicorn/prevent-abbreviations": "off",
				"unicorn/string-content": "off",
			},
		},
		{ files: "*.d.ts", rules: { "@typescript-eslint/no-unused-vars": "off" } },
		{
			files: ["modules/auto/secrets.ts", "modules/_private/secrets.ts"],
			rules: { "sort-keys": ["error", "asc", { caseSensitive: false, natural: true }] },
		},
	],
	parser: "@typescript-eslint/parser",
	parserOptions: {
		ecmaVersion: "latest",
		project: true,
		sourceType: "module",
		tsconfigRootDir: __dirname,
	},
	plugins: ["@typescript-eslint"],
	rules: {
		"@typescript-eslint/no-base-to-string": [
			"error",
			{
				ignoredTypeNames: [
					//todo
					"AnonymousGuild",
					"BaseGuildEmoji",
					"CategoryChannel",
					"ClientUser",
					"OAuth2Guild",
					"ReactionEmoji",
					"DirectoryChannel",
					"PublicThreadChannel",
					"PrivateThreadChannel",
					"Guild",
					"GuildEmoji",
					"GuildPreviewEmoji",
					"InviteGuild",
					"PartialDMChannel",
					"PartialGuildMember",
					"PartialMessage",
					"PartialUser",
					"BaseGuildTextChannel",
					"BaseGuildVoiceChannel",
					"ForumChannel",
					"MediaChannel",
					"NewsChannel",
					"TextChannel",
					"StageChannel",
					"VoiceChannel",
				],
			},
		],
		"@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: false }],
		"@typescript-eslint/no-unsafe-member-access": "off",
		"@typescript-eslint/no-unused-vars": [
			"error",
			{ args: "all", argsIgnorePattern: /^_+$/.source, caughtErrors: "all" },
		],
		"@typescript-eslint/restrict-template-expressions": "off",
		"no-fallthrough": "off",
		"no-mixed-spaces-and-tabs": "off",
		"no-restricted-syntax": [
			"error",
			"CallExpression[callee.name='String']",
			"TSIndexSignature",
		],
		"no-sparse-arrays": "off",
		"quotes": ["error", "double", { avoidEscape: true }],
		"unicorn/catch-error-name": ["error", { ignore: [/(?:E|^e)rror(?:[^a-z]|$)/] }],
		"unicorn/explicit-length-check": "off",
		"unicorn/filename-case": ["error", { case: "camelCase" }],
		"unicorn/no-array-callback-reference": "off",
		"unicorn/no-array-reduce": "off",
		"unicorn/no-await-expression-member": "off",
		"unicorn/no-keyword-prefix": "off",
		"unicorn/no-nested-ternary": "off",
		"unicorn/no-null": ["warn", { checkStrictEquality: true }],
		"unicorn/no-process-exit": "off",
		"unicorn/no-unreadable-array-destructuring": "off",
		"unicorn/number-literal-case": "off",
		"unicorn/prefer-native-coercion-functions": "off", // TODO: add total-ts
		"unicorn/prevent-abbreviations": [
			"warn",
			{
				checkDefaultAndNamespaceImports: true,
				checkProperties: true,
				checkShorthandImports: true,
				checkShorthandProperties: true,
				replacements: {
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
		"unicorn/string-content": [
			"warn",
			{
				patterns: {
					[/\.{3}/.source]: "…",
					'"': { message: 'Prefer `“` or `”` over `"`.', suggest: '"' },
					"'": "’",
					"->": "→",
					[/http:\/\//.source]: "https://",
				},
			},
		],
	},
};
// todo: https://github.com/eslint/eslint/pull/17500/files
// todo: no empty func
// todo: stop nesting why tf are there 14-level nesting places
// todo: no promise all
// todo: unicorn/prefer-spread with objects
