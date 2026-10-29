import { getTranslation } from "../assets/translations/index";
import type { Language, TranslationKey } from "../types/translations";

export function translate(
	language: Language,
	key: TranslationKey,
	fallback: string,
	values?: Record<string, string>,
): string {
	let value = getTranslation(language)[key] ?? fallback;
	if (values) {
		for (const [name, replacement] of Object.entries(values)) {
			value = value.replaceAll(`{${name}}`, replacement);
		}
	}
	return value;
}
