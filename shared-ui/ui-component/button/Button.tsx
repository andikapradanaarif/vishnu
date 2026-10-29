import classNames from "classnames";
import { useRef, type MouseEventHandler, type PointerEventHandler } from "react";
import LoadingSpinner from "../loadingAnimation/LoadingSpinner";
import type { ButtonColor, ButtonProps, ButtonSize, ButtonVariant } from "./type";
import { createRipple, type RipplePointer } from "../../utils/ripple";

export const Button = (props: ButtonProps) => {
	const {
		type = "button",
		size = "md",
		children,
		variant = "filled",
		color = "primary",
		colorClassName,
		className,
		onClick,
		disabled,
		isLoading,
		form,
		icon,
		iconPosition = "left",
		rounded = "md",
		onPointerDown,
		...restProps
	} = props;

	const buttonRef = useRef<HTMLButtonElement>(null);

	// Ripple fires on pointerdown so presses flash the moment they land
	// instead of waiting for the release. Keyboard activation has no
	// pointerdown — the click handler covers it via detail === 0.
	const handlePointerDown: PointerEventHandler<HTMLButtonElement> = (event) => {
		onPointerDown?.(event);
		if (disabled || isLoading || event.button !== 0) return;

		const button = buttonRef.current;
		if (button) {
			const pointer: RipplePointer = { clientX: event.clientX, clientY: event.clientY };
			createRipple(button, pointer);
		}
	};

	const handleClick: MouseEventHandler<HTMLButtonElement> = (event) => {
		if (disabled || isLoading) return;

		if (event.detail === 0 && buttonRef.current) {
			const pointer: RipplePointer = { clientX: event.clientX, clientY: event.clientY };
			createRipple(buttonRef.current, pointer);
		}

		onClick?.(event);
	};

	const roundedClassMap: Record<string, string> = {
		md: "rounded-md",
		lg: "rounded-3xl",
		none: "rounded-none",
	};

	const roundedClass = roundedClassMap[rounded];

	return (
		<button
			{...restProps}
			type={type}
			ref={buttonRef}
			className={classNames(
				"group relative inline-flex justify-center items-center overflow-hidden border-[1px] font-medium focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-transparent cursor-pointer focus:shadow-none",
				buttonStyling(variant, color),
				disabledStyling(variant),
				isLoading && loadingStyling,
				buttonSize(variant, size),
				roundedClass,
				className,
				colorClassName,
			)}
			onClick={disabled || isLoading ? undefined : handleClick}
			onPointerDown={handlePointerDown}
			disabled={disabled}
			form={form}
		>
			{/* left icon */}
			{icon && iconPosition === "left" && (
				<span className="mr-1.5 inline-flex items-center">{icon}</span>
			)}

			{/* label/content */}
			{children}

			{/* right icon (e.g. chevron) */}
			{icon && iconPosition === "right" && (
				<span className="ml-1.5 inline-flex items-center">{icon}</span>
			)}

			{/* loading */}
			{isLoading && (
				<span className="ml-2 inline-flex items-center">
					<LoadingSpinner size={14} />
				</span>
			)}
		</button>
	);
};

const buttonStyling = (variant: ButtonVariant, color: ButtonColor): string => {
	switch (variant) {
		case "filled":
			switch (color) {
				case "primary":
					return "text-on-primary bg-primary-500 border-transparent hover:bg-primary-700/95 transition-colors duration-200";
				case "danger":
					return "text-on-primary bg-danger-500 border-transparent hover:bg-danger-600/95 transition-colors duration-200";
				default:
					// custom/other: the base border-[1px] would render in
					// currentColor — suppress like the named colors do.
					return "border-transparent transition-colors duration-200";
			}
		case "outlined":
			switch (color) {
				case "primary":
					return "border-primary-400 text-primary-400 bg-transparent hover:border-primary-300 hover:bg-primary-500/20 transition-colors duration-200";
				case "danger":
					return "border-danger-500 text-danger-500 bg-transparent hover:bg-danger-500/20 transition-colors duration-200";
				default:
					return "border-transparent bg-transparent transition-colors duration-200";
			}
		case "text":
			switch (color) {
				case "primary":
					return "bg-transparent text-primary-400 hover:text-primary-300 border-transparent transition-colors duration-200";
				case "danger":
					return "bg-transparent text-danger-500 hover:text-danger-400 border-transparent transition-colors duration-200";
				default:
					return "bg-transparent border-transparent transition-colors duration-200";
			}
		default:
			return "";
	}
};

const buttonSize = (variant: ButtonVariant, size: ButtonSize): string => {
	if (variant === "text") {
		switch (size) {
			case "sm":
				return "py-0 px-3 font-normal text-sm";
			case "md":
				return "py-0 px-4 font-normal text-base";
			case "lg":
				return "py-0 px-6 font-normal text-lg";
			default:
				return "";
		}
	}

	switch (size) {
		case "sm":
			return "py-1.5 px-3 text-sm";
		case "md":
			return "py-2 px-4 text-base";
		case "lg":
			return "py-3 px-6 text-lg";
		default:
			return "";
	}
};
const disabledCommonStyling =
	"disabled:cursor-not-allowed disabled:hover:!opacity-100 disabled:!border-transparent";

const disabledStyling = (variant: ButtonVariant): string => {
	if (variant === "text") {
		return `disabled:!text-neutral-400 disabled:!bg-transparent ${disabledCommonStyling}`;
	}
	return `disabled:!bg-neutral-400 disabled:!text-white ${disabledCommonStyling}`;
};

const loadingStyling = "animate-pulse opacity-80 cursor-not-allowed pointer-events-none";
