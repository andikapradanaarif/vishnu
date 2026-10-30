/**
 * This function returns a string comparison function,
 * given an accessor to the compared field.
 */
export function stringComparisonFn<T>(fn: (item: T) => string) {
	return (firstItem: T, secondItem: T) => {
		const firstString = fn(firstItem)?.toLowerCase() || "";
		const secondString = fn(secondItem)?.toLowerCase() || "";

		if (!firstString && !secondString) return 0;
		if (!firstString) return 1;
		if (!secondString) return -1;

		if (firstString < secondString) return -1;
		if (firstString > secondString) return 1;
		return 0;
	};
}

/** reversing the comparison between a to b to b to a */
function reverseComparisonFn<T>(fn: (a: T, b: T) => number) {
	return (firstItem: T, secondItem: T) => fn(secondItem, firstItem);
}

/**
 * This function returns a date comparison function,
 * given an accessor to the compared field.
 */
export function dateComparisonFn<T>(fn: (item: T) => Date | null) {
	return reverseComparisonFn(numberComparisonFn<T>((item) => fn(item)?.getTime() || null));
}

/**
 * This function returns a number comparison function,
 * given an accessor to the compared field.
 */
export function numberComparisonFn<T>(fn: (item: T) => number | null) {
	return (firstItem: T, secondItem: T) => {
		const firstNumber = fn(firstItem) || 0;
		const secondNumber = fn(secondItem) || 0;
		return firstNumber - secondNumber;
	};
}
