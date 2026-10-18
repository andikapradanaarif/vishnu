export const storageKeys = {
	LANGUAGE: "language",
} as const;

export type StorageKeys = (typeof storageKeys)[keyof typeof storageKeys];
