import { describe, it, expect } from "bun:test";
import { clamp, snapValue } from "../Slider";

describe("Slider value normalization", () => {
	it("snaps a value to the nearest step within bounds", () => {
		expect(snapValue(7, 0, 100, 10)).toBe(10);
		expect(snapValue(4, 0, 100, 10)).toBe(0);
		expect(snapValue(15, 0, 100, 10)).toBe(20);
	});

	it("clamps to min and max", () => {
		expect(clamp(-5, 0, 100)).toBe(0);
		expect(clamp(150, 0, 100)).toBe(100);
		expect(clamp(50, 50, 50)).toBe(50);
	});

	it("handles step <= 0 by just clamping", () => {
		expect(snapValue(33, 0, 100, 0)).toBe(33);
		expect(snapValue(200, 0, 100, 0)).toBe(100);
	});

	it("does not yank multi-digit entry when step > 1 (typed value matches snapped only when equal)", () => {
		// Typing "5" with step=10 snaps to 10 (JS Math.round rounds 0.5 up),
		// so 5 !== 10 and onChange is NOT called — letting the user keep typing.
		const typed = 5;
		const snapped = snapValue(typed, 0, 100, 10);
		expect(snapped).toBe(10);
		expect(typed === snapped).toBe(false);

		// Typing "50" with step=10 snaps to 50, so 50 === 50 and onChange IS called.
		const typed50 = 50;
		const snapped50 = snapValue(typed50, 0, 100, 10);
		expect(snapped50).toBe(50);
		expect(typed50 === snapped50).toBe(true);
	});

	it("treats empty input as a no-op falling back to current value (onBlur)", () => {
		const currentValue = 42;
		const normalizeBlur = (raw: string): number => {
			if (raw === "" || raw === "-") return currentValue;
			const parsed = Number(raw);
			return Number.isFinite(parsed) ? snapValue(parsed, 0, 100, 1) : currentValue;
		};
		expect(normalizeBlur("")).toBe(42);
		expect(normalizeBlur("-")).toBe(42);
		expect(normalizeBlur("abc")).toBe(42);
		expect(normalizeBlur("55")).toBe(55);
	});

	it("avoids floating-point artifacts for fractional steps", () => {
		// step=0.1 should produce clean decimals, not 0.30000000000000004
		expect(snapValue(0.3, 0, 1, 0.1)).toBe(0.3);
		expect(snapValue(0.2, 0, 1, 0.1)).toBe(0.2);
		expect(snapValue(0.05, 0, 1, 0.1)).toBe(0.1);
	});

	it("handles scientific-notation and two-digit fractional steps", () => {
		expect(snapValue(0.00000005, 0, 1, 1e-7)).toBe(0.0000001);
		expect(snapValue(0.27, 0, 1, 0.25)).toBe(0.25);
		expect(snapValue(0.38, 0, 1, 0.25)).toBe(0.5);
	});
});
