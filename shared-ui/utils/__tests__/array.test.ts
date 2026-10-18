import {describe, it, expect} from "bun:test";
import {filterTree, flatten} from "../array";

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
			{id: "2", name: "Child A", children: [{id: "4", name: "Grandchild"}]},
			{id: "3", name: "Child B"},
		],
	},
	{id: "5", name: "Standalone"},
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
		const nodes: TreeNode[] = [{id: "a", name: "A"}];
		expect(flatten(nodes, (node) => node.children)).toEqual([{id: "a", name: "A"}]);
	});

	it("preserves node references", () => {
		const result = flatten(tree, (node) => node.children);
		expect(result[0]).toBe(tree[0]);
	});
});

describe("filterTree", () => {
	it("filters items by predicate, keeping matching parents and children", () => {
		const result = filterTree(
			tree,
			(node) => node.children,
			(node, children) => ({...node, children}),
			(node) => node.name.includes("Child"),
		);
		const ids = result.map((n) => n.id);
		// "Child A" and "Child B" match, plus grandchild is included as a child
		expect(ids).toContain("2");
		expect(ids).toContain("3");
	});

	it("returns empty array for empty input", () => {
		const result = filterTree(
			[],
			(node: TreeNode) => node.children,
			(node, children) => ({...node, children}),
			() => true,
		);
		expect(result).toEqual([]);
	});

	it("includes all nodes when predicate always true", () => {
		const result = filterTree(
			tree,
			(node) => node.children,
			(node, children) => ({...node, children}),
			() => true,
		);
		// All items should be included: root, child A, grandchild, child B, standalone
		expect(result.length).toBe(5);
	});

	it("excludes all nodes when predicate always false", () => {
		const result = filterTree(
			tree,
			(node) => node.children,
			(node, children) => ({...node, children}),
			() => false,
		);
		// Parent nodes are excluded but children are still pushed
		// The traverse function pushes mappedChildren regardless of predicate
		expect(result.length).toBe(0);
	});

	it("filters standalone nodes", () => {
		const result = filterTree(
			tree,
			(node) => node.children,
			(node, children) => ({...node, children}),
			(node) => node.id === "5",
		);
		expect(result.map((n) => n.id)).toEqual(["5"]);
	});
});
