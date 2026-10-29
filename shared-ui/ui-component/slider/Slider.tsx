import classNames from "classnames";
import {useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent} from "react";
import Caption from "../text/Caption";
import Input from "../input/Input";
import type {SliderInputProps, SliderProps} from "./type";

/**
 * Clamps a number between a min and max bound.
 */
export const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

/**
 * Converts a value in [min, max] to a 0-100 percentage.
 */
const valueToPercent = (value: number, min: number, max: number): number => (max === min ? 0 : ((value - min) / (max - min)) * 100);

/**
 * Returns the number of decimal places to use for a given step, handling
 * decimal strings and scientific notation (e.g. 0.25 -> 2, 1e-7 -> 7).
 */
const getStepDecimals = (step: number): number => {
	if (step <= 0 || !Number.isFinite(step)) return 0;
	const str = step.toString().toLowerCase();
	const eIndex = str.indexOf("e");
	if (eIndex >= 0) {
		const mantissa = str.slice(0, eIndex);
		const exponent = parseInt(str.slice(eIndex + 1), 10);
		const mantissaDecimals = mantissa.split(".")[1]?.length ?? 0;
		return Math.max(0, -exponent + mantissaDecimals);
	}
	const fraction = str.split(".")[1];
	return fraction ? fraction.length : 0;
};

/**
 * Snaps a value to the nearest step within [min, max], rounded to avoid
 * floating-point artifacts for fractional steps.
 */
export const snapValue = (value: number, min: number, max: number, step: number): number => {
	if (step <= 0) return clamp(value, min, max);
	const clamped = clamp(min + Math.round((value - min) / step) * step, min, max);
	const decimals = getStepDecimals(step);
	return decimals > 0 ? Number(clamped.toFixed(decimals)) : clamped;
};

/**
 * Single-thumb range slider with optional tick marks, drag/click/keyboard support,
 * number input support, and layout matching field components.
 */
export const Slider = (props: SliderProps) => {
	const {
		value,
		onChange,
		min = 0,
		max = 100,
		step = 1,
		marks = [],
		inputPrefixIcon,
		inputSuffixIcon,
		disabled = false,
		viewMode,
		className = "",
		wrapperClassName = "",
		name = "slider",
		label,
		direction = "column",
		required = false,
		error,
		success,
		message,
		sliderOnly = false,
	} = props;

	const reactId = useId();
	const thumbId = `${reactId}-thumb`;
	const inputId = `${reactId}-input`;
	const labelId = `${reactId}-label`;
	const thumbRef = useRef<HTMLDivElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [trackNode, setTrackNode] = useState<HTMLDivElement | null>(null);

	const percent = clamp(valueToPercent(value, min, max), 0, 100);
	const hasError = Boolean(error);

	const updateValueFromClientX = useCallback(
		(clientX: number) => {
			if (!trackNode) return;

			const rect = trackNode.getBoundingClientRect();
			const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
			const rawValue = min + ratio * (max - min);
			onChange?.(snapValue(rawValue, min, max, step));
		},
		[trackNode, min, max, step, onChange],
	);

	const handleTrackPointerDown = (e: PointerEvent<HTMLDivElement>) => {
		if (disabled || viewMode) return;

		e.preventDefault();
		e.currentTarget.setPointerCapture(e.pointerId);
		setIsDragging(true);
		updateValueFromClientX(e.clientX);
	};

	const handleTrackPointerMove = (e: PointerEvent<HTMLDivElement>) => {
		if (!isDragging || disabled || viewMode) return;

		updateValueFromClientX(e.clientX);
	};

	const handleTrackPointerUp = (e: PointerEvent<HTMLDivElement>) => {
		if (e.currentTarget.hasPointerCapture(e.pointerId)) {
			e.currentTarget.releasePointerCapture(e.pointerId);
		}
		setIsDragging(false);
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		if (disabled || viewMode) return;

		let delta = 0;

		switch (e.key) {
			case "ArrowRight":
			case "ArrowUp":
				delta = step;
				break;
			case "ArrowLeft":
			case "ArrowDown":
				delta = -step;
				break;
			case "PageUp":
				delta = step * 10;
				break;
			case "PageDown":
				delta = -step * 10;
				break;
			case "Home":
				e.preventDefault();
				onChange?.(min);
				return;
			case "End":
				e.preventDefault();
				onChange?.(max);
				return;
			default:
				return;
		}

		e.preventDefault();
		onChange?.(snapValue(value + delta, min, max, step));
	};

	const handleLabelClick = useCallback(() => {
		thumbRef.current?.focus();
	}, []);

	return (
		<div
			className={classNames(
				"flex",
				wrapperClassName,
				direction === "row" ? "flex-row gap-4" : "flex-col",
				marks.length > 0 && "pb-4",
			)}
		>
			{label && (
				<label
					id={labelId}
					onClick={handleLabelClick}
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
				<div className={classNames("flex flex-col sm:flex-row sm:items-center w-full", viewMode ? "gap-1" : "gap-6")}>
					<div
						ref={setTrackNode}
						className={classNames(
							"relative h-1 mx-3 sm:mx-4 sm:flex-1 rounded-full bg-neutral-200 my-4 touch-none",
							!disabled && !viewMode && "cursor-pointer",
							disabled && "cursor-not-allowed opacity-50",
							className,
						)}
						onPointerDown={handleTrackPointerDown}
						onPointerMove={handleTrackPointerMove}
						onPointerUp={handleTrackPointerUp}
						onPointerCancel={handleTrackPointerUp}
					>
						<div
							className={classNames(
								"absolute top-0 h-1 rounded-full transition-[width] duration-150",
								hasError ? "bg-danger-500" : success ? "bg-success-600" : "bg-primary-500",
							)}
							style={{width: `${percent}%`}}
						/>

						{marks.map((mark) => {
							const markPercent = clamp(valueToPercent(mark.value, min, max), 0, 100);

							return (
								<div key={`${mark.value}-${mark.label ?? ""}`}>
									<div
										className={classNames(
											"absolute top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-150",
											mark.value <= value ? "bg-primary-500" : "bg-neutral-400",
										)}
										style={{left: `${markPercent}%`}}
									/>
									{mark.label != null && (
										<span
											className="absolute top-4 -translate-x-1/2 whitespace-nowrap text-xs text-neutral-500"
											style={{left: `${markPercent}%`}}
										>
											{mark.label}
										</span>
									)}
								</div>
							);
						})}

						<div
							ref={thumbRef}
							id={thumbId}
							role="slider"
							tabIndex={disabled || viewMode ? -1 : 0}
							aria-disabled={disabled || viewMode}
							aria-required={required}
							aria-invalid={hasError}
							aria-valuemin={min}
							aria-valuemax={max}
							aria-valuenow={clamp(value, min, max)}
							aria-label={label ? undefined : name}
							aria-labelledby={label ? labelId : undefined}
							className={classNames(
								"absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-white transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500/30",
								!disabled && !viewMode && "cursor-pointer",
								hasError ? "border-danger-500" : success ? "border-success-600" : "border-primary-500",
							)}
							style={{left: `${percent}%`}}
							onKeyDown={handleKeyDown}
						/>
					</div>

					<SliderInput
						viewMode={viewMode}
						value={value}
						min={min}
						max={max}
						step={step}
						name={name}
						label={label}
						labelId={label ? labelId : undefined}
						id={inputId}
						disabled={disabled}
						error={error}
						inputPrefixIcon={inputPrefixIcon}
						inputSuffixIcon={inputSuffixIcon}
						onChange={onChange}
						sliderOnly={sliderOnly}
					/>
				</div>

				{sliderOnly && typeof error === "string" && error && <Caption className="text-danger-500 mt-1">{error}</Caption>}
				{!error && success && <Caption className="text-success-700 mt-1">{success}</Caption>}
				{!error && !success && message && <Caption className="text-neutral-600 mt-1">{message}</Caption>}
			</div>
		</div>
	);
};

/**
 * Renders the value display for a Slider — a read-only "value / max" span in
 * view mode, or a clamped numeric Input in edit mode.
 */
const SliderInput = ({
	viewMode,
	value,
	min = 0,
	max = 100,
	step = 1,
	name,
	label,
	labelId,
	id,
	disabled,
	error,
	inputPrefixIcon,
	inputSuffixIcon,
	onChange,
	sliderOnly,
}: SliderInputProps) => {
	const [inputValue, setInputValue] = useState(String(value));
	const stepDecimals = getStepDecimals(step);

	useEffect(() => {
		setInputValue(String(value));
	}, [value]);

	if (sliderOnly) return null;

	const normalizeValue = (rawValue: string): number => {
		if (rawValue === "" || rawValue === "-") return value;
		const parsed = Number(rawValue);
		return Number.isFinite(parsed) ? snapValue(parsed, min, max, step) : value;
	};

	if (viewMode) {
		return (
			<span className="text-sm text-neutral-600 shrink-0 pl-3 tabular-nums">
				{value.toFixed(stepDecimals)} / {max.toFixed(stepDecimals)}
			</span>
		);
	}

	return (
		<Input
			name={name}
			id={id}
			ariaLabelledBy={labelId}
			ariaLabel={labelId ? undefined : label ?? name}
			type="number"
			value={inputValue}
			step={step}
			min={min}
			max={max}
			disabled={disabled}
			error={error}
			prefixIcon={inputPrefixIcon}
			suffixIcon={inputSuffixIcon}
			onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
				const rawValue = e.target.value;
				setInputValue(rawValue);
				if (rawValue === "" || rawValue === "-" || rawValue.endsWith(".")) return;
				const parsed = Number(rawValue);
				if (!Number.isFinite(parsed)) return;
				const snapped = normalizeValue(rawValue);
				// Only propagate when the typed value already matches its snapped
				// form, so users can type multi-digit values without the slider
				// yanking the value (e.g. step=10 typing "50" -> 5 snaps to 10).
				// Final normalization happens on blur.
				if (parsed === snapped) onChange?.(snapped);
			}}
			onBlur={() => {
				const normalized = normalizeValue(inputValue);
				setInputValue(String(normalized));
				if (normalized !== value) onChange?.(normalized);
			}}
			onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
				if (e.key !== "Enter") return;
				e.preventDefault();
				const normalized = normalizeValue(inputValue);
				setInputValue(String(normalized));
				if (normalized !== value) onChange?.(normalized);
			}}
			wrapperClassName="w-24 shrink-0"
		/>
	);
};
