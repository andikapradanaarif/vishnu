import {useEffect, type ReactNode} from "react";
import {addTranslation, getTranslation} from "../assets/translations/index";
import type {Language, TranslationMap} from "../types/translations";

export interface TranslationProviderProps {
	children?: ReactNode;
	translations: TranslationMap;
	language?: Language;
}

export function TranslationProvider({children, translations, language = "en"}: TranslationProviderProps) {
	useEffect(() => {
		addTranslation(language, {...getTranslation(language), ...translations});
	}, [language, translations]);

	return <>{children}</>;
}
