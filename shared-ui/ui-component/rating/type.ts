export type RatingSize = "sm" | "md" | "lg";

export type RatingColor = "primary" | "warning" | "danger" | "success" | "custom";

export interface RatingProps {
	/** Current rating value (0 to max). */
	value: number;
	/** Maximum number of stars. Defaults to 5. */
	max?: number;
	/** Step between selectable values. `0.5` enables half-star precision. Defaults to 1. */
	step?: 0.5 | 1;
	/** Disables interaction and dims the stars. */
	readOnly?: boolean;
	/** Disables interaction. */
	disabled?: boolean;
	/** Size of each star. */
	size?: RatingSize;
	/** Color of the active stars. */
	color?: RatingColor;
	/** Extra classes appended after the color classes; only guaranteed to take effect with color="custom". */
	colorClassName?: string;
	/** Show the numeric value next to the stars. */
	showValue?: boolean;
	/** Custom label for the value (e.g. "(3.5)"). */
	valueLabel?: string;
	/** Called with the new value when the user selects a star. */
	onChange?: (value: number) => void;
	/** Optional accessible label. Defaults to "Rating". */
	ariaLabel?: string;
	className?: string;
}
