import { deepStrictEqual } from "node:assert";
import { describe, it } from "node:test";
import { parseMarkdown } from "./markdown.js";

await describe("parseMarkdown", async () => {
	await it("should distinguish bold and italic", () => {
		deepStrictEqual(parseMarkdown("HIHIHI qwe**r**ty*oui*p"), [
			{
				content: [
					{ content: "HIHIHI qwe", type: "text" },
					{ content: [{ content: "r", type: "text" }], type: "strong" },
					{ content: "ty", type: "text" },
					{ content: [{ content: "oui", type: "text" }], type: "em" },
					{ content: "p", type: "text" },
				],
				type: "paragraph",
			},
		]);
	});
	await it("should parse an assortment of syntax", () => {
		deepStrictEqual(
			parseMarkdown(`# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6

**Bold Text**

*Italic Text*

~~Strikethrough Text~~

__Underlined Text__

\`Inline Code\`


> Blockquote

- Unordered
- List
- Items

1. Ordered
2. List
3. Items

[Link Text](https://google.com)

||Spoiler Text||

:smile: :+1: :tada:

@everyone @here

#channel-name @username

`),
			[
				{ level: 1, content: [{ content: "Heading 1", type: "text" }], type: "heading" },
				{ level: 2, content: [{ content: "Heading 2", type: "text" }], type: "heading" },
				{ level: 3, content: [{ content: "Heading 3", type: "text" }], type: "heading" },
				{
					content: [
						{ content: "#", type: "text" },
						{ content: "#", type: "text" },
						{ content: "#", type: "text" },
						{ content: "# Heading 4", type: "text" },
						{ type: "br" },
						{ content: "#", type: "text" },
						{ content: "#", type: "text" },
						{ content: "#", type: "text" },
						{ content: "#", type: "text" },
						{ content: "# Heading 5", type: "text" },
						{ type: "br" },
						{ content: "#", type: "text" },
						{ content: "#", type: "text" },
						{ content: "#", type: "text" },
						{ content: "#", type: "text" },
						{ content: "#", type: "text" },
						{ content: "# Heading 6", type: "text" },
					],
					type: "paragraph",
				},
				{
					content: [
						{ content: [{ content: "Bold Text", type: "text" }], type: "strong" },
					],
					type: "paragraph",
				},
				{
					content: [{ content: [{ content: "Italic Text", type: "text" }], type: "em" }],
					type: "paragraph",
				},
				{
					content: [
						{ content: [{ content: "Strikethrough Text", type: "text" }], type: "del" },
					],
					type: "paragraph",
				},
				{
					content: [
						{ content: [{ content: "Underlined Text", type: "text" }], type: "u" },
					],
					type: "paragraph",
				},
				{ content: [{ content: "Inline Code", type: "inlineCode" }], type: "paragraph" },
				{
					content: [
						{ content: "Blockquote", type: "text" },
						{ content: "\n", type: "text" },
					],
					type: "blockQuote",
				},
				{
					content: [
						{ type: "br" },
						{
							ordered: false,
							start: undefined,
							items: [
								[{ content: "Unordered", type: "text" }],
								[{ content: "List", type: "text" }],
								[{ content: "Items", type: "text" }],
							],
							type: "list",
						},
					],
					type: "paragraph",
				},
				{
					ordered: true,
					start: 1,
					items: [
						[{ content: "Ordered", type: "text" }],
						[{ content: "List", type: "text" }],
						[{ content: "Items", type: "text" }],
					],
					type: "list",
				},
				{
					content: [
						{ type: "br" },
						{
							content: [{ content: "Link Text", type: "text" }],
							target: "https://google.com",
							title: undefined,
							type: "link",
						},
					],
					type: "paragraph",
				},
				{ content: [{ content: "Spoiler Text", type: "text" }], type: "spoiler" },
				{ type: "br" },
				{
					content: [
						{ type: "br" },
						{ content: ":smile", type: "text" },
						{ content: ": ", type: "text" },
						{ content: ":", type: "text" },
						{ content: "+1", type: "text" },
						{ content: ": ", type: "text" },
						{ content: ":tada", type: "text" },
						{ content: ":", type: "text" },
					],
					type: "paragraph",
				},
				{
					content: [
						{ content: "@everyone", type: "massMention" },
						{ content: " ", type: "text" },
						{ content: "@here", type: "massMention" },
					],
					type: "paragraph",
				},
				{
					content: [
						{ content: "#channel", type: "text" },
						{ content: "-name ", type: "text" },
						{ content: "@username", type: "text" },
					],
					type: "paragraph",
				},
			],
		);
	});
	await it("should parse lists with abnormal numbers of spaces", () => {
		deepStrictEqual(
			parseMarkdown(`hi
     - b
ey`),
			[
				{
					content: [
						{ content: "hi", type: "text" },
						{ type: "br" },
						{
							ordered: false,
							start: undefined,
							items: [[{ content: "b", type: "text" }]],
							type: "list",
						},
						{ content: "ey", type: "text" },
					],
					type: "paragraph",
				},
			],
		);
	});
	await it("should parse nested lists", () => {
		deepStrictEqual(
			parseMarkdown(`- a
 - a
- a`),
			[
				{
					ordered: false,
					start: undefined,
					items: [
						[
							{ content: "a", type: "text" },
							{ type: "br" },
							{
								ordered: false,
								start: undefined,
								items: [[{ content: "a", type: "text" }]],
								type: "list",
							},
						],
						[{ content: "a", type: "text" }],
					],
					type: "list",
				},
				{ content: "\n", type: "text" },
			],
		);
	});
	await it("should parse a complex list", () => {
		deepStrictEqual(
			parseMarkdown(`
- Unordered
  - List
- Items
 1. Ordered
 2. List
   3. Items
`),
			[
				{
					ordered: false,
					start: undefined,
					items: [
						[
							{ content: "Unordered", type: "text" },
							{ type: "br" },
							{
								ordered: false,
								start: undefined,
								items: [[{ content: "List", type: "text" }]],
								type: "list",
							},
						],
						[
							{ content: "Items", type: "text" },
							{ type: "br" },
							{
								ordered: true,
								start: 1,
								items: [
									[{ content: "Ordered", type: "text" }],
									[
										{ content: "List", type: "text" },
										{ type: "br" },
										{
											ordered: true,
											start: 3,
											items: [[{ content: "Items", type: "text" }]],
											type: "list",
										},
									],
								],
								type: "list",
							},
						],
					],
					type: "list",
				},
				{ content: "\n", type: "text" },
			],
		);
	});
	await it("should handle an empty string", () => {
		deepStrictEqual(parseMarkdown(""), [
			{ content: "\n", type: "text" },
			{ content: "\n", type: "text" },
		]);
	});
});
