import classNames from "classnames";
import {forwardRef} from "react";
import LoadingAnimation from "../loadingAnimation/LoadingDots";
import type {InputProps} from "./types";
import Caption from "../text/Caption";

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
	{
		label,
		placeholder,
		name,
		id,
		ariaLabel,
		ariaLabelledBy,
		type,
		value,
		onChange,
		onClick,
		onBlur,
		onFocus,
		onKeyDown,
		disabled,
		isLoading,
		autoComplete,
		required,
		message,
		error,
		success,
		prefixIcon,
		suffixIcon,
		onSuffixIconClick,
		onPrefixIconClick,
		direction = "column",
		className,
		wrapperClassName,
		step,
		min,
		max,
		maxLength,
	},
	ref,
) {
	return (
		<div className={classNames("flex", wrapperClassName, direction === "row" ? "flex-row gap-4" : "flex-col")}>
			{label && (
				<label
					htmlFor={id ?? name}
					className={classNames(
						"block text-neutral-700",
						direction === "row" ? "flex items-center flex-shrink-0 w-32 text-sm h-9.5" : "text-xs mb-1",
					)}
				>
					{required && <span className="text-danger-500 mr-1">*</span>}
					{label}
				</label>
			)}
			<div className={direction === "row" ? "flex-1" : ""}>
				<div className="relative flex items-center">
					<input
						ref={ref}
						id={id ?? name}
						name={name}
						aria-label={ariaLabelledBy ? undefined : ariaLabel}
						aria-labelledby={ariaLabelledBy || undefined}
						aria-invalid={Boolean(error)}
						type={type}
						autoComplete={autoComplete}
						required={required}
						value={value}
						onChange={onChange}
						onClick={onClick}
						onBlur={onBlur}
						onFocus={onFocus}
						onKeyDown={onKeyDown}
						disabled={disabled}
						placeholder={placeholder}
						className={classNames(
							"appearance-none block w-full px-3 py-2 border border-neutral-400/65 rounded-md placeholder-neutral-400 focus:outline-none focus:shadow-none focus:border-[var(--color-primary)] text-sm",
							disabled ? "bg-neutral-100 cursor-not-allowed text-neutral-700" : "bg-surface text-neutral-800",
							suffixIcon || isLoading ? "pr-10" : "",
							suffixIcon && isLoading ? "pr-16" : "",
							prefixIcon ? "pl-9" : "",
							error && "border-danger-500",
							success && "border-success-600",
							className,
						)}
						step={step}
						min={min}
						max={max}
						maxLength={maxLength}
					/>

					{prefixIcon && (
						<span
							onClick={disabled ? undefined : onPrefixIconClick}
							className={classNames(
								"absolute left-3 inline-flex items-center text-neutral-500",
								disabled || !onPrefixIconClick
									? "cursor-not-allowed pointer-events-none text-neutral-400"
									: "cursor-pointer",
							)}
						>
							{prefixIcon}
						</span>
					)}

					{isLoading && (
						<span
							className={classNames(
								"absolute",
								suffixIcon ? "right-10" : "right-4",
								"inline-flex items-center justify-center text-neutral-500",
							)}
						>
							<LoadingAnimation className="w-4 h-4" />
						</span>
					)}
					{suffixIcon && (
						<span
							onClick={disabled ? undefined : onSuffixIconClick}
							className={classNames(
								"absolute right-4 inline-flex items-center text-neutral-500",
								disabled || !onSuffixIconClick
									? "cursor-not-allowed pointer-events-none text-neutral-400"
									: "cursor-pointer",
							)}
						>
							{suffixIcon}
						</span>
					)}
				</div>
				{message && <Caption className="text-neutral-600 mt-1">{message}</Caption>}
				{typeof error === "string" && error && <Caption className="text-danger-500 mt-1">{error}</Caption>}
				{success && <Caption className="text-success-700 mt-1">{success}</Caption>}
			</div>
		</div>
	);
});

export default Input;
