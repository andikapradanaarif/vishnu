/** simple string hashing function */
export const getStringHash = (str: string): number => {
	let hash = 0;
	if (!str) return hash;

	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32bit integer
	}

	return Math.abs(hash);
};

/**
 * Decode HTML response
 * @param text
 * @returns
 */
export const decodeHtml = (text: string) => {
	const doc = new DOMParser().parseFromString(text, "text/html");
	return doc.documentElement.textContent ?? "";
};

/**
 * Combine first and last name into a full name, handling missing values
 */
export const getFullName = (firstName?: string | null, lastName?: string | null): string => {
	return [firstName, lastName].filter(Boolean).join(" ");
};

/**
 * Reads text from the system clipboard.
 * Must be triggered by a user action like a button click.
 */
export async function pasteFromClipboard(): Promise<string | null> {
	try {
		const text = await navigator.clipboard.readText();
		return text;
	} catch (error) {
		console.error("Failed to read clipboard contents:", error);
		return null;
	}
}
