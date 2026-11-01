export function filterTree<T>(
	items: T[],
	getChildren: (item: T) => T[] | undefined,
	mapFn: (item: T, children: T[]) => T,
	predicate: (item: T) => boolean,
): T[] {
	const result: T[] = [];

	for (const item of items) {
		if (predicate(item)) {
			// The node itself matches — keep it with its whole subtree
			// (a provider search shows every model in the group).
			result.push(mapFn(item, getChildren(item) ?? []));
			continue;
		}
		const mappedChildren = filterTree(getChildren(item) ?? [], getChildren, mapFn, predicate);
		if (mappedChildren.length > 0) {
			result.push(mapFn(item, mappedChildren));
		}
	}

	return result;
}

export function flatten<T>(items: T[], getChildren: (item: T) => T[] | undefined): T[] {
	const result: T[] = [];

	function traverse(items: T[]) {
		for (const item of items) {
			result.push(item);
			const children = getChildren(item);
			if (children) {
				traverse(children);
			}
		}
	}

	traverse(items);
	return result;
}
