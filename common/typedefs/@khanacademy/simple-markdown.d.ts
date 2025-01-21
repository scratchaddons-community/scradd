/* eslint-disable @typescript-eslint/no-invalid-void-type */
export type UnTypedASTNode = Record<string, unknown>;
export type SingleASTNode = UnTypedASTNode & { type: string };
export type ASTNode = SingleASTNode | SingleASTNode[];
export type Output = (this: void, node: ASTNode, state?: State | null) => string;
export type State = Record<string, unknown> & { key?: number | string; inline?: boolean | null };

export type Parser = (this: void, source: string, state?: State | null) => SingleASTNode[];
export type HtmlNodeOutput = (
	this: void,
	node: SingleASTNode,
	output: Output,
	state: State,
) => string;
export type Rule = {
	order: number;
	match: ((
		this: void,
		source: string,
		state: State,
		previous: string,
	) => RegExpMatchArray | null | undefined) & { regex?: RegExp };
	quality?(this: void, capture: RegExpMatchArray, state: State, previous: string): number;
	parse(
		this: void,
		capture: RegExpMatchArray,
		parse: Parser,
		state: State,
	): ASTNode | UnTypedASTNode;
	html: HtmlNodeOutput | null;
};
export type OutputRule = Rule & { html: HtmlNodeOutput };

export type DefaultRules = {
	Array: { html(this: void, node: SingleASTNode[], nestedOutput: Output, state: State): string };
	autolink: Rule;
	blockQuote: OutputRule;
	br: OutputRule;
	codeBlock: OutputRule;
	def: OutputRule;
	del: OutputRule;
	em: OutputRule;
	escape: Rule;
	fence: Rule;
	heading: OutputRule;
	hr: OutputRule;
	image: OutputRule;
	inlineCode: OutputRule;
	lheading: Rule;
	link: OutputRule;
	list: OutputRule;
	mailto: Rule;
	newline: OutputRule;
	nptable: Rule;
	paragraph: OutputRule;
	refimage: Rule;
	reflink: Rule;
	strong: OutputRule;
	table: OutputRule;
	tableSeparator: Rule;
	text: OutputRule;
	u: OutputRule;
	url: Rule;
};
export type Rules = Record<string, Rule>;
export type Attribute = boolean | number | string | null | undefined;

declare const Exports: {
	default: {
		defaultRules: DefaultRules;
		parserFor(this: void, rules: Rules, defaultState?: State | null): Parser;
		outputFor(this: void, rules: Rules, parameter: "html", defaultState?: State | null): Output;
		sanitizeText(this: void, text: Attribute): string;
		sanitizeUrl(this: void, url?: string | null): string | null | undefined;
		htmlTag(
			this: void,
			tagName: string,
			content: string,
			attributes?: Record<string, Attribute>,
			isClosed?: boolean,
		): string;
	};
};
export default Exports;
