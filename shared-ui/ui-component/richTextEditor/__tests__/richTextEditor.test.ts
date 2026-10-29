import { describe, it, expect } from "bun:test";
import { createEditor, type Descendant } from "slate";
import { withReact } from "slate-react";
import { toggleBlock } from "../RichTextEditor";

function makeEditor(initial: Descendant[]): ReturnType<typeof withReact> {
	const editor = withReact(createEditor());
	editor.children = initial as any;
	editor.selection = {
		anchor: { path: [0, 0], offset: 0 },
		focus: { path: [0, 0], offset: 0 },
	};
	return editor;
}

describe("RichTextEditor list toggling", () => {
	it("wraps a paragraph into a bulleted list", () => {
		const editor = makeEditor([
			{ type: "paragraph", children: [{ text: "hi" }] } as unknown as Descendant,
		]);
		toggleBlock(editor, "bulleted-list");
		const block = editor.children[0] as any;
		expect(block.type).toBe("bulleted-list");
		expect(block.children[0].type).toBe("list-item");
	});

	it("unwraps a bulleted list back to a paragraph", () => {
		const editor = makeEditor([
			{
				type: "bulleted-list",
				children: [{ type: "list-item", children: [{ text: "hi" }] }],
			} as unknown as Descendant,
		]);
		editor.selection = {
			anchor: { path: [0, 0, 0], offset: 0 },
			focus: { path: [0, 0, 0], offset: 0 },
		};
		toggleBlock(editor, "bulleted-list");
		const block = editor.children[0] as any;
		expect(block.type).toBe("paragraph");
	});

	it("converts a bulleted list to a numbered list in place", () => {
		const editor = makeEditor([
			{
				type: "bulleted-list",
				children: [{ type: "list-item", children: [{ text: "hi" }] }],
			} as unknown as Descendant,
		]);
		editor.selection = {
			anchor: { path: [0, 0, 0], offset: 0 },
			focus: { path: [0, 0, 0], offset: 0 },
		};
		toggleBlock(editor, "numbered-list");
		const block = editor.children[0] as any;
		expect(block.type).toBe("numbered-list");
		expect(block.children[0].type).toBe("list-item");
	});

	it("toggles a block quote on and off", () => {
		const editor = makeEditor([
			{ type: "paragraph", children: [{ text: "quote" }] } as unknown as Descendant,
		]);
		toggleBlock(editor, "block-quote");
		expect((editor.children[0] as any).type).toBe("block-quote");
		toggleBlock(editor, "block-quote");
		expect((editor.children[0] as any).type).toBe("paragraph");
	});

	it("converts only the innermost nested list type", () => {
		const editor = makeEditor([
			{
				type: "bulleted-list",
				children: [
					{ type: "list-item", children: [{ text: "outer" }] },
					{
						type: "bulleted-list",
						children: [{ type: "list-item", children: [{ text: "inner" }] }],
					},
				],
			} as unknown as Descendant,
		]);
		editor.selection = {
			anchor: { path: [0, 1, 0, 0], offset: 0 },
			focus: { path: [0, 1, 0, 0], offset: 0 },
		};
		toggleBlock(editor, "numbered-list");
		const outer = editor.children[0] as any;
		expect(outer.type).toBe("bulleted-list");
		expect(outer.children[1].type).toBe("numbered-list");
		expect(outer.children[1].children[0].type).toBe("list-item");
	});
});
