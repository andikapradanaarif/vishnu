import { describe, it, expect } from "bun:test";
import { validator, passwordValidator, startTimeValidator, endTimeValidator } from "../form";
import type { FormRules, PasswordRules, TimeTrackingRules } from "../../types/form";

describe("validator", () => {
	it("returns undefined when all rules pass", () => {
		expect(validator("hello", ["required", "minLength"], { minLength: 3 })).toBeUndefined();
	});

	it("returns 'required' for empty string", () => {
		expect(validator("", ["required"])).toBe("required" as FormRules);
	});

	it("returns 'required' for whitespace-only string", () => {
		expect(validator("   ", ["required"])).toBe("required" as FormRules);
	});

	it("returns 'minLength' when value is too short", () => {
		expect(validator("ab", ["required", "minLength"], { minLength: 3 })).toBe(
			"minLength" as FormRules,
		);
	});

	it("returns 'maxLength' when value is too long", () => {
		expect(validator("abcdef", ["maxLength"], { maxLength: 3 })).toBe("maxLength" as FormRules);
	});

	it("returns 'containsUrl' when value has URL", () => {
		expect(validator("check http://example.com", ["containsUrl"])).toBe("containsUrl" as FormRules);
	});

	it("returns 'containsUrl' for www domain", () => {
		expect(validator("visit www.example.com", ["containsUrl"])).toBe("containsUrl" as FormRules);
	});

	it("returns undefined for plain text with no URL", () => {
		expect(validator("just plain text", ["containsUrl"])).toBeUndefined();
	});

	it("returns 'containsHtmlOrScript' for HTML tags", () => {
		expect(validator("<script>alert(1)</script>", ["containsHtmlOrScript"])).toBe(
			"containsHtmlOrScript" as FormRules,
		);
	});

	it("returns 'containsHtmlOrScript' for javascript: pattern", () => {
		expect(validator("javascript:alert(1)", ["containsHtmlOrScript"])).toBe(
			"containsHtmlOrScript" as FormRules,
		);
	});

	it("returns 'containsSuspiciousPattern' for SQL injection", () => {
		expect(validator("' or 1=1", ["containsSuspiciousPattern"])).toBe(
			"containsSuspiciousPattern" as FormRules,
		);
	});

	it("returns 'containsSuspiciousPattern' for template literal", () => {
		expect(validator("${x}", ["containsSuspiciousPattern"])).toBe(
			"containsSuspiciousPattern" as FormRules,
		);
	});

	it("returns 'containsDisallowedCharacters' for default disallowed chars", () => {
		expect(validator("hello<world>", ["containsDisallowedCharacters"])).toBe(
			"containsDisallowedCharacters" as FormRules,
		);
	});

	it("returns undefined for allowed chars", () => {
		expect(validator("hello world", ["containsDisallowedCharacters"])).toBeUndefined();
	});

	it("returns undefined for empty value with disallowed chars check", () => {
		expect(validator("", ["containsDisallowedCharacters"])).toBeUndefined();
	});

	it("supports custom disallowed characters", () => {
		expect(
			validator("hello@world", ["containsDisallowedCharacters"], { disallowedCharacters: ["@"] }),
		).toBe("containsDisallowedCharacters" as FormRules);
	});

	it("returns 'invalidEmail' for bad email", () => {
		expect(validator("not-an-email", ["invalidEmail"])).toBe("invalidEmail" as FormRules);
	});

	it("returns undefined for valid email", () => {
		expect(validator("user@example.com", ["invalidEmail"])).toBeUndefined();
	});

	it("returns undefined for empty string with invalidEmail rule", () => {
		expect(validator("", ["invalidEmail"])).toBeUndefined();
	});

	it("returns first failing rule in order", () => {
		// 'required' should be checked before 'minLength'
		expect(validator("", ["required", "minLength"], { minLength: 3 })).toBe(
			"required" as FormRules,
		);
	});
});

describe("passwordValidator", () => {
	it("returns 'required' for empty password", () => {
		expect(passwordValidator("")).toBe("required" as PasswordRules);
	});

	it("returns 'minLength' for short password", () => {
		expect(passwordValidator("Aa1!")).toBe("minLength" as PasswordRules);
	});

	it("returns 'containLetter' for password without letters", () => {
		expect(passwordValidator("12345678!")).toBe("containLetter" as PasswordRules);
	});

	it("returns 'containLowercase' for password without lowercase", () => {
		expect(passwordValidator("ABCDEFGH1!")).toBe("containLowercase" as PasswordRules);
	});

	it("returns 'containUppercase' for password without uppercase", () => {
		expect(passwordValidator("abcdefg1!")).toBe("containUppercase" as PasswordRules);
	});

	it("returns 'containNumber' for password without numbers", () => {
		expect(passwordValidator("Abcdefgh!")).toBe("containNumber" as PasswordRules);
	});

	it("returns 'containSpecialCharacter' for password without special chars", () => {
		expect(passwordValidator("Abcdefg1")).toBe("containSpecialCharacter" as PasswordRules);
	});

	it("returns undefined for valid strong password", () => {
		expect(passwordValidator("Strong123!")).toBeUndefined();
	});
});

describe("startTimeValidator", () => {
	const selectedDate = new Date(2025, 0, 1);

	it("returns 'required' for empty value", () => {
		expect(startTimeValidator("", selectedDate)).toBe("required" as TimeTrackingRules);
	});

	it("returns 'startTimeInvalid' for invalid time format", () => {
		expect(startTimeValidator("invalid", selectedDate)).toBe(
			"startTimeInvalid" as TimeTrackingRules,
		);
	});

	it("returns 'startAfterEnd' when start is after end", () => {
		expect(startTimeValidator("15:00", selectedDate, "13:00")).toBe(
			"startAfterEnd" as TimeTrackingRules,
		);
	});

	it("returns undefined when start is before end", () => {
		expect(startTimeValidator("13:00", selectedDate, "15:00")).toBeUndefined();
	});

	it("returns 'durationIsNotPositive' when start equals end", () => {
		expect(startTimeValidator("14:00", selectedDate, "14:00")).toBe(
			"durationIsNotPositive" as TimeTrackingRules,
		);
	});

	it("returns 'durationTooLong' when duration exceeds 3 hours", () => {
		expect(startTimeValidator("08:00", selectedDate, "12:00")).toBe(
			"durationTooLong" as TimeTrackingRules,
		);
	});
});

describe("endTimeValidator", () => {
	const selectedDate = new Date(2025, 0, 1);

	it("returns 'required' for empty value", () => {
		expect(endTimeValidator("", selectedDate)).toBe("required" as TimeTrackingRules);
	});

	it("returns 'endTimeInvalid' for invalid time format", () => {
		expect(endTimeValidator("invalid", selectedDate)).toBe("endTimeInvalid" as TimeTrackingRules);
	});

	it("returns 'startAfterEnd' when end is before start", () => {
		expect(endTimeValidator("13:00", selectedDate, "15:00")).toBe(
			"startAfterEnd" as TimeTrackingRules,
		);
	});

	it("returns undefined when end is after start", () => {
		expect(endTimeValidator("15:00", selectedDate, "13:00")).toBeUndefined();
	});

	it("returns 'durationIsNotPositive' when end equals start", () => {
		expect(endTimeValidator("14:00", selectedDate, "14:00")).toBe(
			"durationIsNotPositive" as TimeTrackingRules,
		);
	});

	it("returns 'durationTooLong' when duration exceeds 3 hours", () => {
		expect(endTimeValidator("12:00", selectedDate, "08:00")).toBe(
			"durationTooLong" as TimeTrackingRules,
		);
	});
});
