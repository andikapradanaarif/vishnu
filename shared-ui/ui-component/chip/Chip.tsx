import classNames from "classnames";
import type { ChipColorsType, ChipProps, ChipSizeType } from "./type";
import { Icon } from "@iconify/react";

export const Chip = (props: ChipProps) => {
	const {
		value,
		onRemove,
		removeAriaLabel = "Remove",
		color = "default",
		style,
		className,
		colorClassName,
		children,
		size = "md",
		variant = "subtle",
	} = props;

	const isSolid = variant === "solid";
	const colorClass =
		color === "custom"
			? ""
			: isSolid
				? `${solidBgColorMap[color]} text-on-primary`
				: `${bgColorMap[color]} ${fontColorMap[color]}`;

	return (
		<div
			className={classNames(
				"inline-block rounded-full cursor-default text-center",
				colorClass,
				sizeMap[size],
				className,
				colorClassName,
			)}
			style={style}
		>
			<div className="flex justify-between items-center">
				<span
					className={classNames({
						"mr-2": !!onRemove && !!value,
					})}
				>
					{children}
				</span>
				{onRemove && value && (
					<span
						role="button"
						tabIndex={0}
						aria-label={removeAriaLabel}
						className="font-bold cursor-pointer inline-flex items-center"
						onClick={(e) => {
							e.stopPropagation();
							onRemove(value);
						}}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								e.stopPropagation();
								onRemove(value);
							}
						}}
					>
						<Icon icon="ri:close-circle-line" />
					</span>
				)}
			</div>
		</div>
	);
};

const bgColorMap: Record<ChipColorsType, string> = {
	red: "bg-danger-100/80",
	yellow: "bg-warning-100",
	blue: "bg-info-50",
	green: "bg-success-100/70",
	grey: "bg-neutral-200/70",
	default: "bg-neutral-200/70",
	orange: "bg-warning-100/70",
	indigo: "bg-primary-100/70",
	pink: "bg-pink-100/70",
	custom: "",
};

// Darker fills keep white text at >= 4.5:1 contrast for all colors.
const solidBgColorMap: Record<ChipColorsType, string> = {
	red: "bg-danger-600",
	yellow: "bg-warning-700",
	blue: "bg-info-600",
	green: "bg-success-700",
	grey: "bg-neutral-600",
	default: "bg-neutral-600",
	orange: "bg-warning-700",
	indigo: "bg-primary-600",
	pink: "bg-pink-600",
	custom: "",
};

const fontColorMap: Record<ChipColorsType, string> = {
	red: "text-danger-600",
	yellow: "text-warning-700",
	blue: "text-info-600",
	green: "text-success-800",
	grey: "text-neutral-600",
	default: "text-primary-600",
	orange: "text-warning-700",
	indigo: "text-primary-600",
	pink: "text-pink-700",
	custom: "",
};

const sizeMap: Record<ChipSizeType, string> = {
	sm: "py-0.5 px-1.5 text-xs",
	md: "py-1 px-2 text-xs",
	lg: "py-1.5 px-3 text-sm",
};
