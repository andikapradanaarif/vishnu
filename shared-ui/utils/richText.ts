import type {Descendant} from "slate";

export const EMPTY_RICH_TEXT_VALUE: Descendant[] = [
	{type: "paragraph", children: [{text: ""}]} as Descendant,
];

/**
 * Returns a fresh empty rich text value.
 *
 * Slate mutates the value array in place, so each editor instance MUST receive
 * its own copy. Reusing a shared constant across multiple editors causes
 * "Unable to find the path for Slate node" errors.
 */
export function createEmptyRichTextValue(): Descendant[] {
	return [{type: "paragraph", children: [{text: ""}]} as Descendant];
}

export function serializeRichText(value: Descendant[]): string {
	return value
		.map((node) => {
			if ("children" in node) {
				const text = (node.children as {text: string}[]).map((c) => c.text).join("");
				return text;
			}
			return "";
		})
		.join("\n")
		.trim();
}

export function deserializeRichText(text: string): Descendant[] {
	if (!text) return EMPTY_RICH_TEXT_VALUE;
	return text.split("\n").map((line) => ({
		type: "paragraph",
		children: [{text: line}],
	})) as Descendant[];
}

export function isRichTextEmpty(value: Descendant[]): boolean {
	return serializeRichText(value).length === 0;
}

/**
 * Serialize a leaf node (text with marks) into HTML, wrapping text in the
 * appropriate formatting tags based on the active marks.
 */
function serializeLeaf(leaf: {
	text: string;
	bold?: boolean;
	italic?: boolean;
	underline?: boolean;
	strikethrough?: boolean;
}): string {
	let el = escapeHtml(leaf.text);
	if (leaf.bold) el = `<b>${el}</b>`;
	if (leaf.italic) el = `<i>${el}</i>`;
	if (leaf.underline) el = `<u>${el}</u>`;
	if (leaf.strikethrough) el = `<s>${el}</s>`;
	return el;
}

function escapeHtml(text: string): string {
	return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Serialize Slate Descendant[] into an HTML string.
 *
 * Block types supported: paragraph, bulleted-list, numbered-list, block-quote.
 * Consecutive list items are grouped into `<ul>`/`<ol>` wrappers. Text marks
 * (bold, italic, underline, strikethrough) are serialized as inline tags.
 */
export function serializeRichTextToHtml(value: Descendant[]): string {
	const nodes = value as Array<{
		type?: string;
		children?: Array<Record<string, unknown> & {text: string}>;
	}>;

	let html = "";
	let i = 0;
	while (i < nodes.length) {
		const node = nodes[i];
		const type = node.type ?? "paragraph";
		const inner = serializeChildren(node);

		if (type === "bulleted-list" || type === "numbered-list") {
			const tag = type === "bulleted-list" ? "ul" : "ol";
			// Detect list-item children (normalized schema) vs flat legacy nodes.
			const hasListItems = node.children?.some((child) => child.type === "list-item");
			if (hasListItems) {
				html += `<${tag}>${node.children?.map((child) => `<li>${serializeChildren(child as unknown as Parameters<typeof serializeChildren>[0])}</li>`).join("") ?? ""}</${tag}>`;
				i += 1;
				continue;
			}
			let listHtml = `<li>${inner}</li>`;
			let j = i + 1;
			while (j < nodes.length && (nodes[j].type ?? "paragraph") === type) {
				listHtml += `<li>${serializeChildren(nodes[j])}</li>`;
				j += 1;
			}
			html += `<${tag}>${listHtml}</${tag}>`;
			i = j;
			continue;
		}

		if (type === "block-quote") {
			html += `<blockquote>${inner}</blockquote>`;
		} else {
			html += `<p>${inner}</p>`;
		}
		i += 1;
	}
	return html;
}

type RichTextChild = Record<string, unknown> & {
	text?: string;
	type?: string;
	children?: RichTextChild[];
};

function serializeListContainer(node: RichTextChild): string {
	const tag = node.type === "numbered-list" ? "ol" : "ul";
	const items = (node.children ?? [])
		.map((child) => `<li>${serializeChildren(child)}</li>`)
		.join("");
	return `<${tag}>${items}</${tag}>`;
}

function serializeChildren(node: RichTextChild): string {
	if (!node.children) return "";
	return node.children
		.map((child) => {
			if (child.type === "bulleted-list" || child.type === "numbered-list") {
				return serializeListContainer(child);
			}
			if (child.children) return serializeChildren(child);
			return serializeLeaf(child as Parameters<typeof serializeLeaf>[0]);
		})
		.join("");
}
