import { describe, it, expect } from "bun:test";
import { filterTree, flatten } from "../array";

type TreeNode = {
	id: string;
	name: string;
	children?: TreeNode[];
};

const tree: TreeNode[] = [
	{
		id: "1",
		name: "Root",
		children: [
			{ id: "2", name: "Child A", children: [{ id: "4", name: "Grandchild" }] },
			{ id: "3", name: "Child B" },
		],
	},
	{ id: "5", name: "Standalone" },
];

describe("flatten", () => {
	it("flattens a tree into a flat list (depth-first)", () => {
		const result = flatten(tree, (node) => node.children);
		expect(result.map((n) => n.id)).toEqual(["1", "2", "4", "3", "5"]);
	});

	it("handles empty array", () => {
		expect(flatten<TreeNode>([], (node) => node.children)).toEqual([]);
	});

	it("handles nodes without children", () => {
		const nodes: TreeNode[] = [{ id: "a", name: "A" }];
		expect(flatten(nodes, (node) => node.children)).toEqual([{ id: "a", name: "A" }]);
	});

	it("preserves node references", () => {
		const result = flatten(tree, (node) => node.children);
		expect(result[0]).toBe(tree[0]);
	});
});

describe("filterTree", () => {
	const mapNode = (node: TreeNode, children: TreeNode[]) => ({ ...node, children });

	it("keeps ancestors with only the matching descendants", () => {
		const result = filterTree(
			tree,
			(node) => node.children,
			mapNode,
			(node) => node.name === "Child A",
		);
		// Root doesn't match but survives to carry Child A.
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe("1");
		expect(result[0].children?.map((n) => n.id)).toEqual(["2"]);
		// Child A's own subtree is kept intact on a direct match.
		expect(result[0].children?.[0].children?.map((n) => n.id)).toEqual(["4"]);
	});

	it("keeps the whole subtree when the parent matches", () => {
		const result = filterTree(
			tree,
			(node) => node.children,
			mapNode,
			(node) => node.name === "Root",
		);
		expect(result).toHaveLength(1);
		expect(result[0].children?.map((n) => n.id)).toEqual(["2", "3"]);
	});

	it("returns empty array for empty input", () => {
		const result = filterTree(
			[],
			(node: TreeNode) => node.children,
			mapNode,
			() => true,
		);
		expect(result).toEqual([]);
	});

	it("returns the full tree when predicate always true", () => {
		const result = filterTree(
			tree,
			(node) => node.children,
			mapNode,
			() => true,
		);
		expect(result.map((n) => n.id)).toEqual(["1", "5"]);
		expect(result[0].children?.map((n) => n.id)).toEqual(["2", "3"]);
	});

	it("excludes all nodes when predicate always false", () => {
		const result = filterTree(
			tree,
			(node) => node.children,
			mapNode,
			() => false,
		);
		expect(result).toEqual([]);
	});

	it("filters standalone nodes", () => {
		const result = filterTree(
			tree,
			(node) => node.children,
			mapNode,
			(node) => node.id === "5",
		);
		expect(result.map((n) => n.id)).toEqual(["5"]);
	});
});
