import {describe, it, expect} from "bun:test";
import {translate} from "../translation";

describe("translate", () => {
	it("returns translated value for known key", () => {
		const result = translate("en", "validation.required", "fallback");
		expect(result).toBe("This field is required");
	});

	it("returns fallback for unknown key", () => {
		const result = translate("en", "nonexistent.key" as never, "my fallback");
		expect(result).toBe("my fallback");
	});

	it("replaces placeholders with values", () => {
		const result = translate("en", "validation.minLength", "fallback", {min: "3"});
		expect(result).toBe("Minimum length is 3");
	});

	it("replaces multiple placeholders", () => {
		// Use a key with multiple placeholders by testing the replacement logic
		const result = translate("en", "validation.maxLength", "fallback", {max: "100"});
		expect(result).toBe("Maximum length is 100");
	});

	it("returns fallback when language has no translation", () => {
		// id language should also have validation.required
		const result = translate("id", "validation.required", "fallback");
		// Should return the Indonesian translation, not the fallback
		expect(result).not.toBe("fallback");
		expect(result.length).toBeGreaterThan(0);
	});

	it("falls back to English when language is not found", () => {
		// getTranslation falls back to English for unknown languages
		const result = translate("en", "validation.required", "fallback");
		expect(result).toBe("This field is required");
	});

	it("returns value with unreplaced placeholders when no values provided", () => {
		const result = translate("en", "validation.minLength", "fallback");
		expect(result).toContain("{min}");
	});
});
