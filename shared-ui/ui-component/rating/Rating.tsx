import { useState, useCallback, type KeyboardEvent } from "react";
import classNames from "classnames";
import { Icon } from "@iconify/react";
import type { RatingColor, RatingProps, RatingSize } from "./type";

const sizeMap: Record<RatingSize, { star: string; text: string }> = {
	sm: { star: "w-4 h-4", text: "text-xs" },
	md: { star: "w-6 h-6", text: "text-sm" },
	lg: { star: "w-8 h-8", text: "text-base" },
};

const colorMap: Record<RatingColor, string> = {
	primary: "text-primary-500",
	warning: "text-warning-400",
	danger: "text-danger-500",
	success: "text-success-500",
	custom: "",
};

const clamp = (value: number, min: number, max: number): number =>
	Math.min(Math.max(value, min), max);

const roundToStep = (value: number, step: number): number => Math.round(value / step) * step;

export const Rating = ({
	value,
	max = 5,
	step = 1,
	readOnly = false,
	disabled = false,
	size = "md",
	color = "warning",
	colorClassName,
	showValue = false,
	valueLabel,
	onChange,
	ariaLabel = "Rating",
	className,
}: RatingProps) => {
	const [hoverValue, setHoverValue] = useState<number | null>(null);
	const isInteractive = !readOnly && !disabled;

	const displayValue = hoverValue ?? value;
	const sizes = sizeMap[size];
	const activeColor = colorMap[color];

	const handleStarClick = useCallback(
		(starIndex: number, isHalf: boolean) => {
			if (!isInteractive || !onChange) return;
			const next = starIndex + (isHalf ? 0.5 : 1);
			onChange(clamp(roundToStep(next, step), 0, max));
		},
		[isInteractive, onChange, step, max],
	);

	const handleStarHover = useCallback(
		(starIndex: number, isHalf: boolean) => {
			if (!isInteractive) return;
			setHoverValue(starIndex + (isHalf ? 0.5 : 1));
		},
		[isInteractive],
	);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent<HTMLDivElement>) => {
			if (!isInteractive || !onChange) return;
			const current = hoverValue ?? value;
			if (event.key === "ArrowRight" || event.key === "ArrowUp") {
				event.preventDefault();
				onChange(clamp(roundToStep(current + step, step), 0, max));
			} else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
				event.preventDefault();
				onChange(clamp(roundToStep(current - step, step), 0, max));
			}
		},
		[isInteractive, onChange, value, hoverValue, step, max],
	);

	const stars = Array.from({ length: max }, (_, i) => i);
	const supportsHalf = step === 0.5;

	return (
		<div
			className={classNames("inline-flex items-center gap-1", className)}
			role="slider"
			aria-label={ariaLabel}
			aria-valuemin={0}
			aria-valuemax={max}
			aria-valuenow={value}
			aria-readonly={readOnly || undefined}
			aria-disabled={disabled || undefined}
			tabIndex={isInteractive ? 0 : undefined}
			onKeyDown={handleKeyDown}
			onMouseLeave={() => isInteractive && setHoverValue(null)}
		>
			<div className={classNames("flex items-center", isInteractive && "cursor-pointer")}>
				{stars.map((starIndex) => {
					const fillRatio = clamp(displayValue - starIndex, 0, 1);
					const isFull = fillRatio >= 1;
					const isHalf = supportsHalf && fillRatio >= 0.5 && fillRatio < 1;
					const isPartial = !isFull && !isHalf && fillRatio > 0;

					return (
						<span
							key={starIndex}
							className={classNames(
								"relative inline-flex transition-transform duration-150",
								isInteractive && "hover:scale-110",
								sizes.star,
							)}
							onClick={() => handleStarClick(starIndex, false)}
							onMouseMove={(e) => {
								if (!isInteractive || !supportsHalf) return;
								const rect = e.currentTarget.getBoundingClientRect();
								const isLeftHalf = e.clientX - rect.left < rect.width / 2;
								handleStarHover(starIndex, isLeftHalf);
							}}
							onMouseEnter={() => !supportsHalf && handleStarHover(starIndex, false)}
						>
							{/* Base (empty) star */}
							<Icon
								icon="ri:star-line"
								className={classNames(sizes.star, "text-neutral-300 absolute inset-0")}
							/>
							{/* Filled overlay */}
							{(isFull || isHalf || isPartial) && (
								<span
									className={classNames(
										"absolute inset-0 overflow-hidden",
										activeColor,
										colorClassName,
									)}
									style={isFull ? undefined : { width: `${fillRatio * 100}%` }}
								>
									<Icon
										icon={isHalf ? "ri:star-half-fill" : "ri:star-fill"}
										className={classNames(sizes.star, "text-current")}
									/>
								</span>
							)}
						</span>
					);
				})}
			</div>
			{showValue && (
				<span className={classNames("text-neutral-600 font-medium", sizes.text)}>
					{valueLabel ?? value}
				</span>
			)}
		</div>
	);
};
