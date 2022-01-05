module.exports = {
	iniSpaceAroundEquals: true,
	printWidth: 100,
	proseWrap: "always",
	quoteProps: "consistent",
	tabWidth: 4,
	trailingComma: "all",
	useTabs: true,
	jsdocDescriptionWithDot: true,
	jsdocPrintWidth: 100,
	jsdocSeparateReturnsFromParam: true,
	bracketSameLine: false,
	vueIndentScriptAndStyle: true,
	overrides: [
		{
			files: ["**.md"],
			options: {
				trailingComma: "es5",
				proseWrap: "never",
				parser: "markdown",
			},
		},
		{
			files: ["**.svg", "**.html", "**.xml"],
			options: {
				trailingComma: "none",
				parser: "html",
				bracketSameLine: true,
			},
		},
		{
			files: ["**.sass", "**.scss", "**.css"],
			options: {
				parser: "scss",
			},
		},
		{
			files: ["**.env", "**.replit", "**/.tx/config"],
			options: {
				parser: "ini",
			},
		},
		{
			files: ["**.json", "**.map"],
			options: {
				parser: "json",
			},
		},
		{
			files: ["package.json", "package-lock.json", "npm-shrinkwrap.json"],
			options: {
				parser: "json-stringify",
			},
		},
		{
			files: [
				"**.code-workspace",
				".code-snippets",
				"**/settings.json",
				"**/launch.json",
				"**/extensions.json",
				"**.jsonc",
				"**.eslintrc",
				"**.eslintrc.json",
				"jsconfig.json",
			],
			options: {
				parser: "json5",
				quoteProps: "preserve",
				trailingComma: "none",
			},
		},
	],
	plugins: [require.resolve("prettier-plugin-jsdoc"), require.resolve("prettier-plugin-ini")],
};