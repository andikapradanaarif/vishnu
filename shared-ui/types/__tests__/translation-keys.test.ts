// This file tests that the TranslationKey type properly validates translation keys

import type {TranslationKey} from "../translations";

// Valid keys (should work)
export const validKey1: TranslationKey = "validation.required";
export const validKey2: TranslationKey = "auth.password.label";
export const validKey3: TranslationKey = "calendar.view.day";

// Invalid keys (should throw TypeScript errors)
// Uncomment to test - these should fail with TypeScript errors

// @ts-expect-error - "nonexistent.key" is not a translation key
export const invalidKey1: TranslationKey = "nonexistent.key";

// Custom keys require type assertion
export const customKey: TranslationKey = "my.custom.key" as TranslationKey;
