import {useCallback, useEffect, useRef, useState} from "react";
import type {Descendant} from "slate";
import {createEmptyRichTextValue, isRichTextEmpty} from "../utils/richText";

/**
 * Manages a single Slate rich-text field's value, error flag, change handler,
 * and reset.
 *
 * Each instance gets its own fresh value via {@link createEmptyRichTextValue}
 * so Slate's in-place mutations don't leak across editors.
 *
 * @param initialValue - Optional initial value (defaults to empty rich text).
 *   Must be serializable (no functions, DOM nodes, Map/Set) as it is
 *   deep-cloned via \`structuredClone\`.
 */
export function useRichTextField(initialValue?: Descendant[]) {
	const [value, setValue] = useState<Descendant[]>(() =>
		initialValue?.length ? structuredClone(initialValue) : createEmptyRichTextValue(),
	);
	const [error, setError] = useState(false);
	const initialValueRef = useRef(initialValue);

	useEffect(() => {
		initialValueRef.current = initialValue;
	}, [initialValue]);

	const handleChange = useCallback(
		(newValue: Descendant[]) => {
			setValue(structuredClone(newValue));
			setError((prev) => (prev && !isRichTextEmpty(newValue) ? false : prev));
		},
		[],
	);

	const reset = useCallback(() => {
		setValue(initialValueRef.current?.length ? structuredClone(initialValueRef.current) : createEmptyRichTextValue());
		setError(false);
	}, []);

	return {value, error, setError, handleChange, reset};
}
