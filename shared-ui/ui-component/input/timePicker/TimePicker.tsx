import classNames from "classnames";
import { useState, useCallback } from "react";
import { Popover } from "../../popover/Popover";
import Caption from "../../text/Caption";
import type { TimePickerProps } from "../types";
import { buildHours, buildMinutes, parseTime } from "./timePicker.utility";
import { TimeColumn } from "./TimeColumn";
import { TimeTrigger } from "./TimeTrigger";

const TimePicker = (props: TimePickerProps) => {
	const {
		name,
		label,
		value,
		onChange,
		placeholder = "HH:mm",
		disabled,
		required,
		error,
		message,
		maxTime,
		minuteStep = 5,
		direction = "column",
		size = "md",
		className,
	} = props;

	const [isOpen, setIsOpen] = useState(false);

	const parsed = parseTime(value);
	const hours = buildHours();
	const minutes = buildMinutes(minuteStep);

	const selectedHH = parsed?.hh ?? null;
	const selectedMM = parsed?.mm ?? null;
	const maxTimeParsed = parseTime(maxTime);

	const handleHourSelect = useCallback(
		(hh: string) => {
			// Clamp a stale minute to the bound when landing on the max hour, so
			// an earlier minute pick can't push the emitted time past maxTime.
			const mm =
				maxTimeParsed && hh === maxTimeParsed.hh && selectedMM && selectedMM > maxTimeParsed.mm
					? maxTimeParsed.mm
					: (selectedMM ?? "00");
			onChange(`${hh}:${mm}`);
		},
		[selectedMM, maxTimeParsed, onChange],
	);

	const handleMinuteSelect = useCallback(
		(mm: string) => {
			const hh = selectedHH ?? "00";
			onChange(`${hh}:${mm}`);
		},
		[selectedHH, onChange],
	);

	return (
		<div
			className={classNames("flex", direction === "row" ? "flex-row gap-4" : "flex-col", className)}
		>
			{label && (
				<span
					className={classNames(
						"block text-neutral-700",
						direction === "row" ? "flex items-center flex-shrink-0 w-32 text-sm" : "text-xs mb-1",
						size === "md" && direction === "row" && "h-9.5",
						size === "sm" && direction === "row" && "h-8.5",
					)}
				>
					{required && <span className="text-danger-500 mr-1">*</span>}
					{label}
				</span>
			)}

			<div className={classNames(direction === "row" && "flex-1")}>
				<Popover
					id={name}
					trigger={
						<TimeTrigger
							name={name}
							value={value}
							placeholder={placeholder}
							disabled={disabled}
							error={error}
							size={size}
							aria-haspopup="dialog"
							aria-expanded={isOpen}
							aria-controls={isOpen ? `popover-content-${name}` : undefined}
						/>
					}
					position="bottom-right"
					isOpen={isOpen && !disabled}
					onOpenChange={() => {
						if (!disabled) setIsOpen((prev) => !prev);
					}}
					className="z-100"
					rootClassName={classNames(direction === "row" && "w-full", "!block")}
					triggerClassName={classNames(direction === "row" && "w-full", "!block")}
				>
					<div className="flex w-full divide-x divide-neutral-100">
						<TimeColumn
							label="HH"
							items={hours}
							selected={selectedHH}
							onSelect={handleHourSelect}
							maxTime={maxTimeParsed?.hh}
							maxTimeReached
						/>
						<TimeColumn
							label="mm"
							items={minutes}
							selected={selectedMM}
							onSelect={handleMinuteSelect}
							maxTime={maxTimeParsed?.mm}
							maxTimeReached={(selectedHH ?? "00") === maxTimeParsed?.hh}
						/>
					</div>
				</Popover>

				{message && <Caption className="text-neutral-600 mt-1">{message}</Caption>}
				{typeof error === "string" && error && (
					<Caption className="text-danger-500 mt-1">{error}</Caption>
				)}
			</div>
		</div>
	);
};

export default TimePicker;
