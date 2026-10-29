import type { ReactNode } from "react";

export interface SliderMarkProps {
	value: number;
	label?: string | number | null;
}

export interface SliderProps {
	name: string;
	/** Current slider value (controlled). */
	value: number;
	/** Called with the next value whenever the user drags, clicks, or uses keyboard controls/input. */
	onChange?: (value: number) => void;
	min?: number;
	max?: number;
	step?: number;
	marks?: SliderMarkProps[];
	inputPrefixIcon?: ReactNode;
	inputSuffixIcon?: ReactNode;
	disabled?: boolean;
	viewMode?: boolean;
	sliderOnly?: boolean;
	className?: string;
	wrapperClassName?: string;
	label?: string;
	/** Layout of the label relative to the slider track. Defaults to 'col'. */
	direction?: "row" | "column";
	required?: boolean;
	/** Error message. When truthy, the thumb and fill render in the error color. */
	error?: string | boolean;
	/** Success message. When set, the thumb and fill render in the success color. */
	success?: string;
	/** Helper text rendered below the slider when there's no error or success message. */
	message?: string;
}

export interface SliderInputProps {
	name: string;
	id?: string;
	label?: string;
	labelId?: string;
	value: number;
	onChange?: (value: number) => void;
	min?: number;
	max?: number;
	step?: number;
	disabled?: boolean;
	viewMode?: boolean;
	sliderOnly?: boolean;
	error?: string | boolean;
	inputPrefixIcon?: ReactNode;
	inputSuffixIcon?: ReactNode;
}
