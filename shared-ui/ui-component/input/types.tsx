import type {
	ChangeEvent,
	FocusEvent,
	HTMLInputTypeAttribute,
	ReactNode,
	MouseEvent,
	JSX,
	KeyboardEvent,
} from "react";
import type { Language } from "../../types/translations";

export interface InputProps {
	label?: string;
	placeholder?: string;
	name: string;
	id?: string;
	ariaLabel?: string;
	ariaLabelledBy?: string;
	type?: HTMLInputTypeAttribute;
	value: string | number;
	onChange: (e: ChangeEvent<HTMLInputElement>) => void;
	onClick?: (e: MouseEvent<HTMLInputElement>) => void;
	onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
	onFocus?: (e: FocusEvent<HTMLInputElement>) => void;
	onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
	maxLength?: number;
	disabled?: boolean;
	isLoading?: boolean;
	autoComplete?: string;
	required?: boolean;
	message?: string;
	error?: string | boolean;
	success?: string;
	prefixIcon?: ReactNode;
	suffixIcon?: ReactNode;
	onSuffixIconClick?: () => void;
	onPrefixIconClick?: () => void;
	wrapperClassName?: string;
	className?: string;
	direction?: "row" | "column";
	step?: string | number | undefined;
	min?: string | number | undefined;
	max?: string | number | undefined;
}

export interface SelectOption<T = string> {
	value: T;
	label: string;
	disabled?: boolean;
	options?: SelectOption<T>[];
	className?: string;
	icon?: JSX.Element;
}

export interface RadioOption<T = string> {
	value: T;
	label: string;
	disabled?: boolean;
	options?: RadioOption<T>[];
	className?: string;
	icon?: JSX.Element;
	tooltip?: string;
}

export interface SelectProps<T = string> {
	label?: ReactNode;
	placeholder?: string;
	name: string;
	value: T | undefined;
	options: SelectOption<T>[];
	onChange: (value: T, option?: SelectOption<T>) => void;
	/** Shows a clear button when a value is selected. Omit to hide it. */
	onClear?: () => void;
	disabled?: boolean;
	isLoading?: boolean;
	required?: boolean;
	message?: string;
	error?: string | boolean;
	success?: string;
	prefixIcon?: ReactNode;
	onPrefixIconClick?: () => void;
	className?: string;
	direction?: "row" | "column";
	isSearchable?: boolean;
	onSearch?: (value: string) => void;
	size?: "sm" | "md";
	language?: Language;
}

export interface TextAreaInputProps {
	label?: string;
	placeholder?: string;
	name: string;
	value: string;
	onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
	onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
	disabled?: boolean;
	isLoading?: boolean;
	autoComplete?: string;
	required?: boolean;
	message?: string;
	error?: string;
	success?: string;
	prefixIcon?: ReactNode;
	suffixIcon?: ReactNode;
	className?: string;
	direction?: "row" | "column";
	rows?: number;
	maxRows?: number;
	maxLength?: number;
}

export interface DateRangePickerProps {
	onDateRangeChange: (range: DateRangeType) => void;
	startDate: Date | null;
	endDate: Date | null;
	placeholder?: string;
	className?: string;
	maxDate?: Date;
	minDate?: Date;
	name: string;
	isClearable?: boolean;
	disabled?: boolean;
	error?: string | boolean;
	label?: ReactNode;
	direction?: "row" | "column";
	size?: "sm" | "md";
	required?: boolean;
	message?: string;
	success?: string;
	dateClassName?: (date: Date) => string;
	showedMonth?: Date;
	onShowedMonthChange?: (value: Date) => void;
	language?: Language;
}

export interface DateRangeType {
	startDate: Date | null;
	endDate: Date | null;
}

export interface DatePickerProps {
	className?: string;
	triggerClassName?: string;
	placeholder?: string;
	maxDate?: Date | null;
	minDate?: Date | null;
	name: string;
	value: Date | null;
	onChange: (value: Date | null) => void;
	isClearable?: boolean;
	disabled?: boolean;
	error?: string | boolean;
	label?: ReactNode;
	direction?: "row" | "column";
	size?: "sm" | "md";
	required?: boolean;
	message?: string;
	dateClassName?: (date: Date) => string;
	showedMonth?: Date;
	onShowedMonthChange?: (value: Date) => void;
	success?: string;
	prefixIcon?: ReactNode;
	suffixIcon?: ReactNode;
	language?: Language;
}

export interface MultipleSelectProps<T = string> {
	label?: ReactNode;
	placeholder?: string;
	name: string;
	value: T[];
	options: SelectOption<T>[];
	onChange: (value: T[]) => void;
	disabled?: boolean;
	isLoading?: boolean;
	required?: boolean;
	message?: string;
	error?: string | boolean;
	success?: string;
	prefixIcon?: ReactNode;
	onPrefixIconClick?: () => void;
	className?: string;
	direction?: "row" | "column";
	isSearchable?: boolean;
	onSearch?: (value: string) => void;
	size?: "sm" | "md";
	maxSelected?: number;
	/** Extra classes for the options popover. */
	popoverClassName?: string;
	/** Makes the options popover span the trigger width. */
	popoverFullWidth?: boolean;
	/** Trigger content: chips per selection, or a "N selected" count. Defaults to "chips". */
	displayMode?: "chips" | "count";
	language?: Language;
}

export interface TimePickerProps {
	name: string;
	label?: string;
	value: string; // "HH:mm"
	onChange: (value: string) => void;
	placeholder?: string;
	disabled?: boolean;
	required?: boolean;
	error?: string | boolean;
	message?: string;
	minuteStep?: 1 | 5 | 10 | 15;
	/** Latest selectable time as "HH:mm". Later hours (and minutes past the max) are disabled. */
	maxTime?: string;
	direction?: "row" | "column";
	size?: "sm" | "md";
	className?: string;
}

export type SegmentedControlSize = "sm" | "md" | "lg";

export interface SegmentedControlOption<T extends string | number> {
	value: T;
	label: string;
	icon?: React.ReactNode;
	disabled?: boolean;
}

export interface SegmentedControlProps<T extends string | number> {
	name: string;
	value: T;
	onChange: (value: T) => void;
	options: SegmentedControlOption<T>[];
	label?: string;
	className?: string;
	direction?: "row" | "column";
	disabled?: boolean;
	size?: SegmentedControlSize;
}

export interface RadioProps {
	label?: string;
	name: string;
	value: string;
	options: RadioOption<string>[];
	onChange: (value: string) => void;
	disabled?: boolean;
	className?: string;
	direction?: "row" | "column";
	optionDirection?: "row" | "column";
	required?: boolean;
}

export interface SwitchProps {
	name: string;
	checked: boolean;
	onChange: (value: boolean) => void;
	label?: string;
	className?: string;
	labelClassName?: string;
	direction?: "row" | "column";
	labelPosition?: "left" | "right";
}

export interface CheckboxProps {
	label?: string;
	onChecked: (value: boolean) => void;
	id: string;
	checked: boolean;
	disabled?: boolean;
	indeterminate?: boolean;
	className?: string;
}
