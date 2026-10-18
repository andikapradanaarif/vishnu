import {describe, it, expect} from "bun:test";
import {serializeRichTextToHtml} from "../richText";

describe("serializeRichTextToHtml", () => {
	it("serializes a paragraph with text marks", () => {
		const value = [{type: "paragraph", children: [{text: "Hello ", bold: true}, {text: "world", italic: true}]}];
		expect(serializeRichTextToHtml(value as any)).toBe("<p><b>Hello </b><i>world</i></p>");
	});

	it("serializes a flat bulleted list", () => {
		const value = [
			{
				type: "bulleted-list",
				children: [
					{type: "list-item", children: [{text: "a"}]},
					{type: "list-item", children: [{text: "b"}]},
				],
			},
		];
		expect(serializeRichTextToHtml(value as any)).toBe("<ul><li>a</li><li>b</li></ul>");
	});

	it("wraps nested lists in ul/ol/li markup", () => {
		const value = [
			{
				type: "bulleted-list",
				children: [
					{
						type: "list-item",
						children: [
							{text: "Item 1"},
							{
								type: "numbered-list",
								children: [{type: "list-item", children: [{text: "Nested"}]}],
							},
						],
					},
				],
			},
		];
		expect(serializeRichTextToHtml(value as any)).toBe("<ul><li>Item 1<ol><li>Nested</li></ol></li></ul>");
	});
});
