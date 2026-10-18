export type CircularProgressColor = "primary" | "success" | "warning" | "danger" | "custom";
export type CircularProgressVariant = "determinate" | "indeterminate";

export interface CircularProgressProps {
	/** Progress value from 0 to 100. Ignored when variant="indeterminate". */
	value?: number;
	/** Visual + behavioral variant. Defaults to "determinate". */
	variant?: CircularProgressVariant;
	/** Ring color. */
	color?: CircularProgressColor;
	/** Extra classes appended after the color classes; only guaranteed to take effect with color="custom". */
	colorClassName?: string;
	/** Diameter of the ring in pixels. Defaults to 40. */
	size?: number;
	/** Stroke thickness in pixels. Defaults to 4. */
	thickness?: number;
	/** Show the numeric percentage in the center. Ignored for indeterminate. */
	showLabel?: boolean;
	/** Custom label text (overrides auto percentage). */
	label?: string;
	/** Animate the stroke-dashoffset transition. Defaults to true. */
	animated?: boolean;
	/** Animation duration in ms. Defaults to 300. */
	animationDuration?: number;
	/** Round line caps. Defaults to true. */
	roundCaps?: boolean;
	/** Track (background ring) color class. Defaults to neutral-200. */
	trackClassName?: string;
	className?: string;
	/** Accessible label. */
	ariaLabel?: string;
}
