/**
 * Delays the execution of the code for a specified number of seconds.
 * @param inSecond - The amount of time to wait in seconds.
 * @returns A promise that resolves after the specified duration.
 */
export function delay(inSecond: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, inSecond * 1000);
	});
}
