// Translation index - safely loads all language files
import type { Language, TranslationMap } from "../../types/translations";
import en from "./en.json";
import id from "./id.json";

// Load translations
const translations: Record<Language, TranslationMap> = {
	en,
	id,
};

export function getTranslation(lang: Language): TranslationMap {
	return translations[lang] || translations.en;
}

export function addTranslation(lang: Language, content: TranslationMap) {
	translations[lang] = content;
}
