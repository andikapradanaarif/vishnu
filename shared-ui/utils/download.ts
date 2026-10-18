/**
 * Helper function to trigger downloading the file by way of a DOM hack.
 */
export const downloadUrlViaDOM = async (blobUrl: string | void | undefined, name: string) => {
	try {
		if (!blobUrl) {
			throw new Error("Failed to generate blob URL");
		}

		const tag = document.createElement("a");
		tag.href = blobUrl;
		tag.download = name;

		document.body.appendChild(tag);
		tag.click();
		document.body.removeChild(tag);
	} catch (error) {
		throw new Error(`downloadUrlViaDOM failed: ${(error as Error).message}`, {cause: error});
	}
};
