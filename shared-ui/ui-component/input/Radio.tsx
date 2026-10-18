import classNames from "classnames";
import {forwardRef} from "react";
import {Icon} from "@iconify/react";
import Paragraph from "../text/Paragraph";
import Tooltip from "../tooltip/Tooltip";
import type {RadioProps} from "./types";

const Radio = forwardRef<HTMLDivElement, RadioProps>((props, forwardedRef) => {
	const {
		name,
		label,
		value,
		options,
		onChange,
		disabled,
		className,
		direction = "column",
		optionDirection = "row",
		required,
	} = props;

	const handleChange = (optionValue: string, optionDisabled?: boolean) => {
		if (!disabled && !optionDisabled) {
			onChange(optionValue);
		}
	};

	return (
		<div
			className={classNames("flex w-full", direction === "row" ? "flex-row gap-4" : "flex-col", className)}
			ref={forwardedRef}
		>
			{label && (
				<label
					className={classNames(
						"block text-neutral-700",
						direction === "row" ? "flex items-center flex-shrink-0 w-32 text-sm" : "mb-2 text-xs",
					)}
				>
					{required && <span className="text-danger-500 mr-1">*</span>}
					{label}
				</label>
			)}
			<div
				className={classNames(
					"flex",
					optionDirection === "column" ? "flex-col gap-1" : "flex-row gap-4",
					direction === "row" ? "flex-1" : "",
				)}
			>
				{options.map((option) => (
					<span key={option.value} className={classNames("flex items-center gap-2", option.disabled && "opacity-50")}>
						<input
							type="radio"
							name={name}
							value={option.value}
							checked={value === option.value}
							disabled={disabled || option.disabled}
							onChange={() => handleChange(option.value, option.disabled)}
							className="hidden"
						/>
						<span
							className={classNames(
								"w-4 h-4 rounded-full border flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer",
								!(disabled || option.disabled) && value === option.value && "border-primary-600",
								!(disabled || option.disabled) && value !== option.value && "border-neutral-300 bg-white",
								(disabled || option.disabled) && "bg-neutral-50 border-neutral-200 cursor-not-allowed",
							)}
							onClick={() => handleChange(option.value, option.disabled)}
						>
							{value === option.value && (
								<span
									className={classNames(
										"w-2 h-2 rounded-full",
										disabled || option.disabled ? "bg-neutral-400" : "bg-primary-600",
									)}
								/>
							)}
						</span>
						{option.label &&
							(option.tooltip ? (
								<Tooltip id={`radio-tooltip-${option.value}`} content={option.tooltip}>
									<div
										className={classNames(
											"flex items-center gap-1",
											disabled || option.disabled ? "text-neutral-400 cursor-not-allowed" : "cursor-pointer",
										)}
										onClick={() => handleChange(option.value, option.disabled)}
									>
										<Paragraph>{option.label}</Paragraph>
										<Icon icon="mdi:information-outline" className="w-4 h-4 text-neutral-500" />
									</div>
								</Tooltip>
							) : (
								<Paragraph
									className={classNames(
										disabled || option.disabled ? "text-neutral-400 cursor-not-allowed" : "cursor-pointer",
									)}
									onClick={() => handleChange(option.value, option.disabled)}
								>
									{option.label}
								</Paragraph>
							))}
					</span>
				))}
			</div>
		</div>
	);
});

Radio.displayName = "Radio";

export {Radio};
