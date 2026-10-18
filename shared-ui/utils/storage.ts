import {storageKeys, type StorageKeys} from "../constants/storageKeys";

const storage = {
	getItem(key: StorageKeys) {
		return localStorage.getItem(key);
	},
	setItem(key: StorageKeys, value: string) {
		localStorage.setItem(key, value);
	},
	removeItem(key: StorageKeys) {
		localStorage.removeItem(key);
	},
};

export const getLanguage = (): string | null => storage.getItem(storageKeys.LANGUAGE);
export const setLanguage = (language: string): void => storage.setItem(storageKeys.LANGUAGE, language);
