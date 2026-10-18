export type ProgressBarColor = "primary" | "success" | "warning" | "danger" | "custom";
export type ProgressBarSize = "sm" | "md" | "lg";
export type ProgressBarVariant = "determinate" | "indeterminate";

export interface ProgressBarProps {
	/** Progress value from 0 to 100. Ignored when variant="indeterminate". */
	value?: number;
	/** Visual + behavioral variant. Defaults to "determinate". */
	variant?: ProgressBarVariant;
	/** Bar color. */
	color?: ProgressBarColor;
	/** Extra classes appended after the color classes; only guaranteed to take effect with color="custom". */
	colorClassName?: string;
	/** Bar height. */
	size?: ProgressBarSize;
	/** Show the numeric percentage label. */
	showLabel?: boolean;
	/** Custom label text (overrides the auto percentage). */
	label?: string;
	/** Animate width changes. Defaults to true. */
	animated?: boolean;
	/** Animation duration in ms. Defaults to 300. */
	animationDuration?: number;
	/** Striped fill pattern. */
	striped?: boolean;
	/** Animate the stripes (implies striped). */
	stripedAnimated?: boolean;
	/** Rounded corners. Defaults to "md". */
	rounded?: "none" | "md" | "full";
	className?: string;
	/** Accessible label. */
	ariaLabel?: string;
}
