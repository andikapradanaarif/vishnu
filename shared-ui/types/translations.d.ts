// Translation types for the lightweight translation system
// This file provides type safety for translation keys and maps

import en from "../assets/translations/en.json";

/**
 * All translation keys from en.json (flat dot-notation key-value pairs)
 * This provides type safety for translation keys.
 *
 * For custom keys outside the library, use type assertion:
 * translate(language, "my.custom.key" as TranslationKey, "fallback")
 */
export type TranslationKey = keyof typeof en;

/**
 * Simple translation map type - key-value pairs for translations
 * Consuming apps can provide any keys they need
 */
export type TranslationMap = Record<string, string>;

export type Language = "en" | "id";
