import {describe, it, expect} from "bun:test";
import {renderHook} from "@testing-library/react";
import {useTimer} from "../useTimer";

describe("useTimer", () => {
	it("returns formatted zero when startTime is null", () => {
		const {result} = renderHook(() => useTimer(null));
		expect(result.current).toBe("00:00");
	});

	it("starts counting from startTime", async () => {
		const startTime = new Date(Date.now() - 65000); // 1 min 5 sec ago
		const {result} = renderHook(() => useTimer(startTime));

		// Should show at least 01:05
		expect(result.current).toMatch(/^\d{2}:\d{2}$/);
		const [minutes] = result.current.split(":").map(Number);
		expect(minutes).toBeGreaterThanOrEqual(1);
	});

	it("accepts custom formatter", () => {
		const startTime = new Date(Date.now() - 5000);
		const {result} = renderHook(() => useTimer(startTime, (ms) => `${Math.floor(ms / 1000)}s`));
		expect(result.current).toMatch(/^\d+s$/);
	});

	it("clamps negative diff to zero", () => {
		const futureTime = new Date(Date.now() + 10000);
		const {result} = renderHook(() => useTimer(futureTime));
		expect(result.current).toBe("00:00");
	});

	it("uses formatterRef so inline formatter does not infinite loop", () => {
		const startTime = new Date(Date.now() - 3000);
		// Inline formatter (new reference each render) — should not cause infinite loop
		const {result} = renderHook(() => useTimer(startTime, (ms) => `${Math.floor(ms / 1000)}s`));
		expect(result.current).toMatch(/^\d+s$/);
	});
});
