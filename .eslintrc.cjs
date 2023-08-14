/** @type {import("eslint").ESLint.ConfigData} */
module.exports = {
	env: { es2021: true, node: true },
	extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
	overrides: [
		{
			files: ".eslintrc.cjs",
			parserOptions: { sourceType: "script" },
		},
	],
	parser: "@typescript-eslint/parser",
	parserOptions: { ecmaVersion: "latest", sourceType: "module" },
	plugins: ["@typescript-eslint"],
	rules: {
		"quotes": ["error", "double", { avoidEscape: true }],
		"semi": ["error", "always"],
		"no-mixed-spaces-and-tabs": "off",
		"no-sparse-arrays": "off",
	},
	ignorePatterns: "dist",
};
