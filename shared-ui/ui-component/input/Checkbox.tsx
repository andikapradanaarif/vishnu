import classNames from "classnames";
import {forwardRef} from "react";
import Paragraph from "../text/Paragraph";
import type {CheckboxProps} from "./types";

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>((props, forwardedRef) => {
	const {id, label, onChecked, checked, disabled, indeterminate = false, className} = props;

	const handleChange = () => {
		if (!disabled) {
			onChecked(!checked);
		}
	};

	return (
		<span className={classNames(label && "flex items-center gap-2", className)} ref={forwardedRef} aria-label={id}>
			<span
				className={classNames(
					"w-4 h-4 rounded border flex items-center justify-center transition-colors",
					!disabled && checked && !indeterminate && "bg-primary-500 border-primary-500",
					!disabled && indeterminate && "bg-surface border-primary-500",
					!disabled && !checked && !indeterminate && "border-neutral-300 bg-surface",
					disabled && "bg-surface-alt border-neutral-200 cursor-not-allowed",
					!disabled && "cursor-pointer",
					label && "flex-shrink-0",
				)}
				onClick={handleChange}
			>
				{indeterminate ? (
					<span className={classNames("w-2 h-0.5 rounded-sm block", disabled ? "bg-neutral-400" : "bg-primary-500")} />
				) : checked ? (
					<svg
						className={classNames("w-2.5 h-2.5", disabled ? "text-neutral-400" : "text-on-primary")}
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
					</svg>
				) : null}
			</span>
			{label && (
				<Paragraph
					className={classNames(disabled ? "text-neutral-400 cursor-not-allowed" : "cursor-pointer")}
					onClick={handleChange}
				>
					{label}
				</Paragraph>
			)}
		</span>
	);
});

Checkbox.displayName = "Checkbox";

export {Checkbox};
