import {describe, it, expect} from "bun:test";
import {renderHook, act} from "@testing-library/react";
import {useRichTextField} from "../useRichTextField";
import {createEmptyRichTextValue} from "../../utils/richText";

describe("useRichTextField", () => {
	it("initializes with empty rich text by default", () => {
		const {result} = renderHook(() => useRichTextField());
		expect(result.current.value).toEqual(createEmptyRichTextValue());
		expect(result.current.error).toBe(false);
	});

	it("initializes with provided initialValue (deep cloned)", () => {
		const initial = createEmptyRichTextValue();
		const {result} = renderHook(() => useRichTextField(initial));
		expect(result.current.value).toEqual(initial);
		// Verify it's a different reference (deep clone)
		expect(result.current.value).not.toBe(initial);
	});

	it("handleChange updates value", () => {
		const {result} = renderHook(() => useRichTextField());
		const newValue = [{type: "paragraph", children: [{text: "hello"}]}];

		act(() => {
			result.current.handleChange(newValue as any);
		});

		expect(result.current.value).toEqual(newValue);
	});

	it("handleChange clears error when value becomes non-empty", () => {
		const {result} = renderHook(() => useRichTextField());

		act(() => result.current.setError(true));
		expect(result.current.error).toBe(true);

		const newValue = [{type: "paragraph", children: [{text: "hello"}]}];
		act(() => result.current.handleChange(newValue as any));
		expect(result.current.error).toBe(false);
	});

	it("reset restores to initialValue", () => {
		const initial = [{type: "paragraph", children: [{text: "initial"}]}];
		const {result} = renderHook(() => useRichTextField(initial as any));

		const newValue = [{type: "paragraph", children: [{text: "changed"}]}];
		act(() => result.current.handleChange(newValue as any));
		act(() => result.current.setError(true));

		act(() => result.current.reset());

		expect(result.current.value).toEqual(initial);
		expect(result.current.error).toBe(false);
	});

	it("reset clears to empty when no initialValue provided", () => {
		const {result} = renderHook(() => useRichTextField());

		const newValue = [{type: "paragraph", children: [{text: "changed"}]}];
		act(() => result.current.handleChange(newValue as any));

		act(() => result.current.reset());

		expect(result.current.value).toEqual(createEmptyRichTextValue());
	});
});
