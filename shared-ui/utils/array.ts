export function filterTree<T>(
	items: T[],
	getChildren: (item: T) => T[] | undefined,
	mapFn: (item: T, children: T[]) => T,
	predicate: (item: T) => boolean,
): T[] {
	const result: T[] = [];

	function traverse(items: T[]) {
		for (const item of items) {
			const children = getChildren(item) || [];
			const mappedChildren = traverse(children);
			const mappedItem = mapFn(item, mappedChildren);

			if (predicate(mappedItem)) {
				result.push(mappedItem);
			}

			if (children.length > 0) {
				result.push(...mappedChildren);
			}
		}
		return [];
	}

	traverse(items);
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
