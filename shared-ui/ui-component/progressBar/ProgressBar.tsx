import classNames from "classnames";
import type {ProgressBarColor, ProgressBarProps, ProgressBarSize, ProgressBarVariant} from "./type";
import "./index.css";

const sizeMap: Record<ProgressBarSize, string> = {
	sm: "h-1.5",
	md: "h-2.5",
	lg: "h-4",
};

const colorMap: Record<ProgressBarColor, string> = {
	primary: "bg-primary-500",
	success: "bg-success-500",
	warning: "bg-warning-400",
	danger: "bg-danger-500",
	custom: "",
};

const roundedMap: Record<NonNullable<ProgressBarProps["rounded"]>, string> = {
	none: "rounded-none",
	md: "rounded-md",
	full: "rounded-full",
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

export const ProgressBar = ({
	value = 0,
	variant = "determinate",
	color = "primary",
	colorClassName,
	size = "md",
	showLabel = false,
	label,
	animated = true,
	animationDuration = 300,
	striped = false,
	stripedAnimated = false,
	rounded = "md",
	className,
	ariaLabel = "Progress",
}: ProgressBarProps) => {
	const clamped = clamp(value, 0, 100);
	const isIndeterminate = variant === "indeterminate";
	const showStripes = striped || stripedAnimated;

	const barStyle = isIndeterminate
		? undefined
		: {
				width: `${clamped}%`,
				transition: animated ? `width ${animationDuration}ms ease-out` : "none",
			};

	return (
		<div className={classNames("flex items-center gap-2 w-full", className)}>
			<div
				className={classNames("relative w-full overflow-hidden bg-neutral-200", sizeMap[size], roundedMap[rounded])}
				role="progressbar"
				aria-label={ariaLabel}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={isIndeterminate ? undefined : clamped}
			>
				{isIndeterminate ? (
					<div
						className={classNames(
							"absolute top-0 left-0 h-full",
							colorMap[color],
							colorClassName,
							roundedMap[rounded],
							showStripes && "bg-stripes",
							stripedAnimated && "animate-indeterminate-stripes",
							"animate-indeterminate-bar",
						)}
					/>
				) : (
					<div
						className={classNames(
							"h-full",
							colorMap[color],
							colorClassName,
							roundedMap[rounded],
							showStripes && "bg-stripes",
							stripedAnimated && "animate-stripes-move",
						)}
						style={barStyle}
					/>
				)}
			</div>
			{showLabel && (
				<span className="text-xs font-medium text-neutral-600 tabular-nums min-w-[3ch] text-right">
					{label ?? (isIndeterminate ? "…" : `${Math.round(clamped)}%`)}
				</span>
			)}
		</div>
	);
};
