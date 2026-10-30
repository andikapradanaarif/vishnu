import { Time } from "../constants/time";
import { PASSWORD_LEN_MIN } from "../constants/user";
import type { FormRules, FormRulesOptions, PasswordRules, TimeTrackingRules } from "../types/form";
import { isSameTime, mergeDateAndTime } from "./date";

type RuleChecker<T = string> = (value: T, options?: FormRulesOptions) => boolean;

/**
 * Matches URL patterns including:
 * - Full URLs with http/https scheme
 * - www-prefixed domains
 * - Bare domains with optional paths
 * @example matches: "http://example.com", "https://site.com/page", "www.example.org", "example.net/path"
 */
const URL_PATTERN_REGEX = /(?:https?:\/\/|www\.|\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?)/iu;

/**
 * Matches HTML tags and script content
 * @example matches: "<script>", "<img>", "<div>", "</p>", "<iframe>"
 */
const HTML_TAG_PATTERN_REGEX = /<[^>]*>/u;

/**
 * Matches JavaScript code patterns and potentially dangerous script attributes
 * @example matches: "javascript:", "onclick=", "eval(", "document.", "<script", "<iframe"
 */
const SCRIPT_PATTERN_REGEX =
	/(?:javascript\s*:|on\w+\s*=|<\s*script\b|<\s*iframe\b|\beval\s*\(|\bdocument\.)/iu;

/**
 * Matches suspicious patterns commonly used in attacks:
 * - Template literals: ${...}
 * - SQL comments: --
 * - SQL keywords: DROP, SELECT, INSERT, DELETE, UPDATE, UNION
 * - Logical operators in quotes: ' or, " and
 * @example matches: "${x}", "--", "DROP table", "' or 1=1", '" and"'
 */
const SUSPICIOUS_SPECIAL_PATTERN_REGEX =
	/(?:\$\{[^}]*\}|--|\b(?:drop|select|insert|delete|update|union)\b|(?:'|")\s*(?:or|and)\b)/iu;

/**
 * Default list of disallowed special characters for name validation
 * Can be overridden via FormRulesOptions.disallowedCharacters
 */
const DEFAULT_DISALLOWED_SPECIAL_CHARACTERS = ["<", ">", "[", "]", "{", "}", "$", "\\", "|", '"'];

/**
 * Escapes regex special characters in a string for safe inclusion in regex patterns
 * @param value - String to escape
 * @returns Escaped string safe for regex construction
 * @example escapeRegexToken("$") returns "\\$"
 */
const escapeRegexToken = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Builds a regex pattern to match any of the provided disallowed characters
 * @param characters - Array of characters to disallow. Uses defaults if empty/undefined.
 * @returns RegExp that matches any disallowed character
 * @example buildDisallowedSpecialCharactersRegex(['<', '>']) returns /(?:<|>)/u
 */
const buildDisallowedSpecialCharactersRegex = (characters?: string[]): RegExp => {
	const sourceCharacters =
		characters && characters.length > 0 ? characters : DEFAULT_DISALLOWED_SPECIAL_CHARACTERS;
	const sanitizedCharacters = sourceCharacters.map((character) => character.trim()).filter(Boolean);

	if (sanitizedCharacters.length === 0) {
		return /$^/u;
	}

	return new RegExp(`(?:${sanitizedCharacters.map(escapeRegexToken).join("|")})`, "u");
};

/**
 * Normalizes input value by:
 * - Unicode NFC normalization (combines accents/characters)
 * - Collapsing multiple spaces to single space
 * - Trimming leading/trailing whitespace
 * @param value - Raw input string
 * @returns Normalized string for validation
 * @example normalizeInputValue("  José   García  ") returns "José García"
 */
const normalizeInputValue = (value: string): string =>
	value.normalize("NFC").replace(/\s+/g, " ").trim();

/**
 * Matches valid email addresses
 * @example matches: "user@example.com", "first.last+tag@sub.domain.org"
 */
const EMAIL_PATTERN_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

// the order of the rules is sorted by the severity of the error
// the first error will be returned
const ruleCheckers: Record<FormRules, RuleChecker> = {
	required: (value) => !value?.trim(),
	minLength: (value, options) =>
		typeof options?.minLength === "number" && value.length < options.minLength,
	maxLength: (value, options) =>
		typeof options?.maxLength === "number" && value.length > options.maxLength,
	containsUrl: (value) => URL_PATTERN_REGEX.test(normalizeInputValue(value)),
	containsHtmlOrScript: (value) => {
		const normalizedValue = normalizeInputValue(value);
		return (
			HTML_TAG_PATTERN_REGEX.test(normalizedValue) || SCRIPT_PATTERN_REGEX.test(normalizedValue)
		);
	},
	containsSuspiciousPattern: (value) =>
		SUSPICIOUS_SPECIAL_PATTERN_REGEX.test(normalizeInputValue(value)),
	containsDisallowedCharacters: (value, options) => {
		const normalizedValue = normalizeInputValue(value);
		const disallowedCharactersRegex = buildDisallowedSpecialCharactersRegex(
			options?.disallowedCharacters,
		);

		if (!normalizedValue) {
			return false;
		}

		return disallowedCharactersRegex.test(normalizedValue);
	},
	invalidEmail: (value) => !!value.trim() && !EMAIL_PATTERN_REGEX.test(normalizeInputValue(value)),
};

/**
 * Validates a form value against specified rules and returns the first failing rule
 * @param value - Input value to validate
 * @param rules - Array of validation rules to check
 * @param options - Optional configuration for rules (minLength, maxLength, disallowedCharacters)
 * @returns First failing rule key, or undefined if all rules pass
 * @example validator("test", ['required', 'minLength'], { minLength: 3 }) returns undefined
 * @example validator("", ['required']) returns 'required'
 */
export const validator = (
	value: string,
	rules: FormRules[],
	options?: FormRulesOptions,
): FormRules | undefined => rules.find((rule) => ruleCheckers[rule]?.(value, options));

/**
 * Validates password strength against security requirements
 * @param value - Password string to validate
 * @param options - Optional configuration (currently unused for passwords)
 * @returns First failing password rule, or undefined if password meets all requirements
 * @example passwordValidator("weak") returns 'containNumber'
 * @example passwordValidator("Strong123!") returns undefined
 */
export const passwordValidator = (
	value: string,
	options?: FormRulesOptions,
): PasswordRules | undefined => {
	const rules = Object.keys(passwordRuleCheckers) as PasswordRules[];
	return rules.find((rule) => passwordRuleCheckers[rule]?.(value, options));
};

const passwordRuleCheckers: Record<PasswordRules, RuleChecker> = {
	required: (value) => !value?.trim(),
	minLength: (value) => value.length < PASSWORD_LEN_MIN,
	containLetter: (value) => !/[a-zA-Z]/.test(value),
	containLowercase: (value) => !/[a-z]/.test(value),
	containUppercase: (value) => !/[A-Z]/.test(value),
	containNumber: (value) => !/\d/.test(value),
	containSpecialCharacter: (value) => !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(value),
};

type TimeRuleChecker = (value: string, selectedDate: Date, crossValue?: string) => boolean;
// maximum time tracking duration is 3 hours
const MAX_TIME_TRACKING_DURATION = 3 * Time.MILLISECONDS_IN_HOUR;

// validate the diff between start time and end time could not exceed than 3 hours
function isValidTimeTrackingDuration(startTime: Date, endTime: Date) {
	const startTimeInMs = startTime.getTime();
	const endTimeInMs = endTime.getTime();

	const diff = endTimeInMs - startTimeInMs;

	return diff <= MAX_TIME_TRACKING_DURATION;
}

/**
 * Rule checkers for start time validation.
 * Order determines priority — first failing rule is returned.
 */
const startTimeRuleCheckers: Record<TimeTrackingRules, TimeRuleChecker> = {
	required: (value) => !value?.trim(),
	startTimeInvalid: (value, selectedDate) => {
		try {
			mergeDateAndTime(selectedDate, value);
			return false;
		} catch {
			return true;
		}
	},
	startTimeFuture: (value, selectedDate) => {
		try {
			return mergeDateAndTime(selectedDate, value) > new Date();
		} catch {
			return false;
		}
	},
	startAfterEnd: (value, selectedDate, endTimeValue) => {
		if (!endTimeValue) return false;
		try {
			const startTime = mergeDateAndTime(selectedDate, value);
			const endTime = mergeDateAndTime(selectedDate, endTimeValue);
			return startTime > endTime;
		} catch {
			return false;
		}
	},
	durationIsNotPositive: (value, selectedDate, endTimeValue) => {
		if (!endTimeValue) return false;
		try {
			const startTime = mergeDateAndTime(selectedDate, value);
			const endTime = mergeDateAndTime(selectedDate, endTimeValue);
			return isSameTime(startTime, endTime);
		} catch {
			return false;
		}
	},
	durationTooLong: (value, selectedDate, endTimeValue) => {
		if (!endTimeValue) return false;
		try {
			const startTime = mergeDateAndTime(selectedDate, value);
			const endTime = mergeDateAndTime(selectedDate, endTimeValue);
			return !isValidTimeTrackingDuration(startTime, endTime);
		} catch {
			return false;
		}
	},
	endTimeInvalid: () => false, // not applicable for start time
	endTimeFuture: () => false, // not applicable for start time
};

/**
 * Rule checkers for end time validation.
 * Order determines priority — first failing rule is returned.
 */
const endTimeRuleCheckers: Record<TimeTrackingRules, TimeRuleChecker> = {
	required: (value) => !value?.trim(),
	endTimeInvalid: (value, selectedDate) => {
		try {
			mergeDateAndTime(selectedDate, value);
			return false;
		} catch {
			return true;
		}
	},
	startAfterEnd: (value, selectedDate, startTimeValue) => {
		if (!startTimeValue) return false;
		try {
			const startTime = mergeDateAndTime(selectedDate, startTimeValue);
			const endTime = mergeDateAndTime(selectedDate, value);
			return endTime < startTime;
		} catch {
			return false;
		}
	},
	durationIsNotPositive: (value, selectedDate, startTimeValue) => {
		if (!startTimeValue) return false;
		try {
			const startTime = mergeDateAndTime(selectedDate, startTimeValue);
			const endTime = mergeDateAndTime(selectedDate, value);
			return isSameTime(startTime, endTime);
		} catch {
			return false;
		}
	},
	durationTooLong: (value, selectedDate, startTimeValue) => {
		if (!startTimeValue) return false;
		try {
			const startTime = mergeDateAndTime(selectedDate, startTimeValue);
			const endTime = mergeDateAndTime(selectedDate, value);
			return !isValidTimeTrackingDuration(startTime, endTime);
		} catch {
			return false;
		}
	},
	endTimeFuture: (value, selectedDate) => {
		try {
			return mergeDateAndTime(selectedDate, value) > new Date();
		} catch {
			return false;
		}
	},
	startTimeFuture: () => false, // not applicable for end time
	startTimeInvalid: () => false, // not applicable for end time
};

/**
 * Validates start time against time tracking rules
 * @param value - Start time string e.g. "14:30"
 * @param selectedDate - The date context from component state
 * @param endTimeValue - Current end time string value for cross-field validation
 * @returns First failing rule key, or undefined if all rules pass
 * @example startTimeValidator("14:30", new Date(), "13:00") returns 'startAfterEnd'
 * @example startTimeValidator("14:30", new Date(), "15:00") returns undefined
 */
export const startTimeValidator = (
	value: string,
	selectedDate: Date,
	endTimeValue?: string,
): TimeTrackingRules | undefined => {
	const rules = Object.keys(startTimeRuleCheckers) as TimeTrackingRules[];
	return rules.find((rule) => startTimeRuleCheckers[rule](value, selectedDate, endTimeValue));
};

/**
 * Validates end time against time tracking rules
 * @param value - End time string e.g. "15:00"
 * @param selectedDate - The date context from component state
 * @param startTimeValue - Current start time string value for cross-field validation
 * @returns First failing rule key, or undefined if all rules pass
 * @example endTimeValidator("13:00", new Date(), "14:30") returns 'startAfterEnd'
 * @example endTimeValidator("15:00", new Date(), "14:30") returns undefined
 */
export const endTimeValidator = (
	value: string,
	selectedDate: Date,
	startTimeValue?: string,
): TimeTrackingRules | undefined => {
	const rules = Object.keys(endTimeRuleCheckers) as TimeTrackingRules[];
	return rules.find((rule) => endTimeRuleCheckers[rule](value, selectedDate, startTimeValue));
};
