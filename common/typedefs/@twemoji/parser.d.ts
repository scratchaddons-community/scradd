export const TypeName = "emoji";
export function parse<AssetType = "png" | "svg">(
	text: string,
	options?: ParseOptions<AssetType>,
): Entity[];
export function toCodePoints(unicodeSurrogates: string): string[];

interface ParseOptions<AssetType = "png" | "svg"> {
	assetType?: AssetType;
	buildUrl?: BuildUrl<AssetType>;
}
interface Entity {
	url: string;
	indices: [number, number];
	text: string;
	type: typeof TypeName;
}
type BuildUrl<AssetType = "png" | "svg"> = (codepoints: string, assetType: AssetType) => string;
