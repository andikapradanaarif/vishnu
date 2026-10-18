import type {Descendant} from "slate";

export interface RichTextEditorProps {
	label?: string;
	placeholder?: string;
	name?: string;
	/**
	 * Controlled/initial value. Applied on first mount and whenever the value
	 * reference changes after that. If you need to reset the editor from a parent
	 * without changing the value reference (e.g. a form reset), remount the
	 * component with a new `key`.
	 *
	 * For uncontrolled usage, use `value` for the initial content and provide
	 * `onChange` to receive updates.
	 *
	 * @deprecated `initialValue` is deprecated in favor of `value`.
	 */
	initialValue?: Descendant[];
	/** Controlled/initial value. See `initialValue` docs for reset behavior. */
	value?: Descendant[];
	/**
	 * Optional version token for controlled `value`. When this number changes,
	 * the editor re-initializes without needing an expensive content comparison.
	 * Consumers using `value` with cloned data (e.g. `useRichTextField`) can
	 * supply this token and bump it only on real form resets.
	 */
	valueVersion?: number;
	/** Called whenever the editor content changes. */
	onChange: (value: Descendant[]) => void;
	required?: boolean;
	/** Error message or flag. When truthy, the editor border renders in error color and `aria-invalid` is set. */
	error?: string | boolean;
	className?: string;
	rows?: number;
	direction?: "row" | "column";
}
