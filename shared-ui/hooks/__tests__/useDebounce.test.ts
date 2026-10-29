import {describe, it, expect} from "bun:test";
import {renderHook, act} from "@testing-library/react";
import {useDebounce, useDebounceFunc} from "../useDebounce";

describe("useDebounce", () => {
	it("returns initial value immediately", () => {
		const {result} = renderHook(() => useDebounce("hello", 500));
		expect(result.current).toBe("hello");
	});

	it("debounces value changes", async () => {
		const {result, rerender} = renderHook(({value, delay}) => useDebounce(value, delay), {
			initialProps: {value: "hello", delay: 100},
		});

		expect(result.current).toBe("hello");

		rerender({value: "world", delay: 100});
		expect(result.current).toBe("hello"); // Not yet updated

		await new Promise((r) => setTimeout(r, 150));
		expect(result.current).toBe("world");
	});

	it("cancels pending update on new value", async () => {
		const {result, rerender} = renderHook(({value}) => useDebounce(value, 100), {
			initialProps: {value: "a"},
		});

		rerender({value: "b"});
		await new Promise((r) => setTimeout(r, 50));
		rerender({value: "c"});
		await new Promise((r) => setTimeout(r, 150));

		expect(result.current).toBe("c");
	});
});

describe("useDebounceFunc", () => {
	it("debounces callback execution", async () => {
		let callCount = 0;
		const {result} = renderHook(() => useDebounceFunc((_arg: string) => {
			callCount++;
		}, 100));

		act(() => {
			result.current("a");
			result.current("b");
			result.current("c");
		});

		expect(callCount).toBe(0);

		await new Promise((r) => setTimeout(r, 150));
		expect(callCount).toBe(1);
	});

	it("uses latest callback via ref", async () => {
		const calls: string[] = [];
		let cb = (arg: string) => calls.push(arg);

		const {result, rerender} = renderHook(({callback}) => useDebounceFunc(callback, 100), {
			initialProps: {callback: cb},
		});

		// Update callback while a debounced call is pending
		act(() => result.current("first"));
		cb = (arg: string) => calls.push(`updated: ${arg}`);
		rerender({callback: cb});

		await new Promise((r) => setTimeout(r, 150));
		expect(calls).toEqual(["updated: first"]);
	});
});
