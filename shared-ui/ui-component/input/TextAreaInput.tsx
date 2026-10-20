import classNames from "classnames";
import {useCallback, useEffect, useRef, forwardRef} from "react";
import type {TextAreaInputProps} from "./types";
import Caption from "../text/Caption";
import LoadingSpinner from "../loadingAnimation/LoadingSpinner";

const TextAreaInput = forwardRef<HTMLTextAreaElement, TextAreaInputProps>(
	(
		{
			label,
			placeholder,
			name,
			value,
			onChange,
			onKeyDown,
			disabled,
			isLoading,
			autoComplete,
			required,
			message,
			error,
			success,
			direction = "column",
			className,
			rows = 1,
			maxRows,
			maxLength,
		},
		ref,
	) => {
		const textareaRef = useRef<HTMLTextAreaElement>(null);

		const adjustTextareaHeight = useCallback(() => {
			const textarea = textareaRef.current;
			if (!textarea) return;

			textarea.style.height = "auto";
			const scrollHeight = textarea.scrollHeight;

			let targetHeight = scrollHeight;

			if (maxRows) {
				const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
				const maxHeight = lineHeight * maxRows;
				targetHeight = Math.min(scrollHeight, maxHeight);
			}

			textarea.style.height = `${targetHeight}px`;
		}, [maxRows]);

		const setRefs = useCallback(
			(node: HTMLTextAreaElement | null) => {
				textareaRef.current = node;
				if (typeof ref === "function") {
					ref(node);
				} else if (ref) {
					ref.current = node;
				}
			},
			[ref],
		);

		useEffect(() => {
			adjustTextareaHeight();
		}, [adjustTextareaHeight, value]);

		useEffect(() => {
			const timeoutId = window.setTimeout(() => {
				adjustTextareaHeight();
			}, 220);

			return () => window.clearTimeout(timeoutId);
		}, [adjustTextareaHeight]);

		return (
			<div className={classNames("flex", direction === "row" ? "flex-row gap-4" : "flex-col")}>
				{label && (
					<label
						htmlFor={name}
						className={classNames(
							"block text-neutral-700",
							direction === "row" ? "flex items-center text-sm flex-shrink-0 w-32 h-9.5" : "text-xs mb-1",
						)}
					>
						{required && <span className="text-danger-500 mr-1">*</span>}
						{label}
					</label>
				)}
				<div className={direction === "row" ? "flex-1" : ""}>
					<div className="relative flex items-center">
						<textarea
							ref={setRefs}
							id={name}
							name={name}
							autoComplete={autoComplete}
							required={required}
							value={value}
							onChange={onChange}
							onKeyDown={onKeyDown}
							disabled={disabled}
							placeholder={placeholder}
							className={classNames(
								"appearance-none block w-full px-3 py-2 border border-neutral-400/65 rounded-md placeholder-neutral-400 focus:outline-none focus:shadow-none focus:border-[var(--color-primary)] text-sm text-neutral-800 min-h-[40px]",
								maxRows ? "overflow-y-auto" : "overflow-hidden",
								disabled ? "bg-neutral-100 cursor-not-allowed text-neutral-400" : "bg-surface",
								error && "border-danger-500",
								success && "border-success-600",
								className,
							)}
							rows={rows}
							maxLength={maxLength}
						/>

						{isLoading && (
							<span
								className={classNames(
									"absolute",
									"inline-flex items-center justify-center text-neutral-500",
									"bottom-3 right-4",
								)}
							>
								<LoadingSpinner size={16} />
							</span>
						)}
					</div>
					{message && <Caption className="text-neutral-600 mt-1">{message}</Caption>}
					{error && <Caption className="text-danger-500 mt-1">{error}</Caption>}
					{success && <Caption className="text-success-700 mt-1">{success}</Caption>}
				</div>
			</div>
		);
	},
);

TextAreaInput.displayName = "TextArea";

export default TextAreaInput;
