import classNames from "classnames";
import type {
	CircularProgressColor,
	CircularProgressProps,
} from "./CircularProgressType";

const colorMap: Record<CircularProgressColor, string> = {
	primary: "text-primary-500",
	success: "text-success-500",
	warning: "text-warning-400",
	danger: "text-danger-500",
	custom: "",
};

const clamp = (value: number, min: number, max: number): number =>
	Math.min(Math.max(value, min), max);

export const CircularProgress = ({
	value = 0,
	variant = "determinate",
	color = "primary",
	colorClassName,
	size = 40,
	thickness = 4,
	showLabel = false,
	label,
	animated = true,
	animationDuration = 300,
	roundCaps = true,
	trackClassName = "text-neutral-200",
	className,
	ariaLabel = "Circular progress",
}: CircularProgressProps) => {
	const clamped = clamp(value, 0, 100);
	const isIndeterminate = variant === "indeterminate";

	const radius = (size - thickness) / 2;
	const circumference = 2 * Math.PI * radius;
	const dashoffset = isIndeterminate
		? circumference * 0.75
		: circumference - (clamped / 100) * circumference;

	const center = size / 2;

	return (
		<div
			className={classNames("relative inline-flex items-center justify-center", className)}
			role="progressbar"
			aria-label={ariaLabel}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={isIndeterminate ? undefined : clamped}
			style={{width: size, height: size}}
		>
			<svg
				width={size}
				height={size}
				viewBox={`0 0 ${size} ${size}`}
				className={isIndeterminate ? "animate-spin" : undefined}
				style={isIndeterminate ? {animationDuration: "1.4s"} : undefined}
			>
				{/* Track */}
				<circle
					cx={center}
					cy={center}
					r={radius}
					fill="none"
					strokeWidth={thickness}
					strokeLinecap={roundCaps ? "round" : "butt"}
					className={trackClassName}
					stroke="currentColor"
				/>
				{/* Progress arc */}
				<circle
					cx={center}
					cy={center}
					r={radius}
					fill="none"
					strokeWidth={thickness}
					strokeLinecap={roundCaps ? "round" : "butt"}
					stroke="currentColor"
					className={classNames(colorMap[color], isIndeterminate && "opacity-80", colorClassName)}
					strokeDasharray={circumference}
					strokeDashoffset={dashoffset}
					transform={`rotate(-90 ${center} ${center})`}
					style={
						isIndeterminate
							? undefined
							: {
									transition: animated
										? `stroke-dashoffset ${animationDuration}ms ease-out`
										: "none",
								}
					}
				/>
			</svg>
			{showLabel && !isIndeterminate && (
				<span
					className="absolute font-medium text-neutral-600 tabular-nums"
					style={{fontSize: size * 0.22}}
				>
					{label ?? `${Math.round(clamped)}%`}
				</span>
			)}
		</div>
	);
};
