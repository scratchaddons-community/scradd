declare module "@twemoji/parser" {
	export const TypeName = "emoji";
	export function parse<AssetType = "svg" | "png">(
		text: string,
		options?: ParseOptions<AssetType>,
	): Entity[];
	export function toCodePoints(unicodeSurrogates: string): string[];

	type ParseOptions<AssetType = "svg" | "png"> = {
		assetType?: AssetType;
		buildUrl?: BuildUrl<AssetType>;
	};
	type Entity = { url: string; indices: [number, number]; text: string; type: typeof TypeName };
	type BuildUrl<AssetType = "svg" | "png"> = (codepoints: string, assetType: AssetType) => string;
}

declare module "@twemoji/parser/dist/lib/regex.js" {
	const regexp: { default: RegExp };
	export default regexp;
}
