import classNames from "classnames";
import {useCallback, useMemo, useState} from "react";
import {Icon} from "@iconify/react";
import {intlFormatDate, listYears, monthsNames, shortWeekNames} from "../../utils/date";
import Select from "./Select";
import type {DatePickerProps} from "./types";
import GeneratedDays from "./GeneratedDays";
import Popover from "../popover/Popover";
import {Button} from "../button/Button";
import {useIsSmallPhone} from "../../hooks/useScreenSize";
import Caption from "../text/Caption";
import {translate} from "../../utils/translation";

const year = new Date().getFullYear();

export const DatePicker = (props: DatePickerProps) => {
	const {
		className,
		triggerClassName,
		placeholder,
		onChange,
		minDate,
		maxDate,
		name,
		value,
		disabled,
		error,
		isClearable = false,
		label,
		direction = "row",
		size = "md",
		required = false,
		message,
		dateClassName,
		showedMonth: showedMonthProps,
		onShowedMonthChange,
		success,
		prefixIcon,
		suffixIcon,
		language = "en",
	} = props;

	const isSmallPhone = useIsSmallPhone();

	const yearOptions = useMemo(() => {
		const minYear = minDate ? minDate.getFullYear() : year - 100;
		const maxYear = maxDate ? maxDate.getFullYear() : year + 100;
		return listYears(minYear, maxYear).map((year) => {
			return {
				label: `${year}`,
				value: year,
			};
		});
	}, [minDate, maxDate]);

	const [isOpen, setIsOpen] = useState(false);
	const [showedMonthState, setShowedMonthState] = useState(value ?? new Date());

	const isControlledShowedMonth = showedMonthProps !== undefined;
	const showedMonth = useMemo(() => {
		return showedMonthProps ?? showedMonthState;
	}, [showedMonthProps, showedMonthState]);

	const handleShowedMonthChange = useCallback(
		(changedValue: Date) => {
			if (isControlledShowedMonth) {
				onShowedMonthChange?.(changedValue);
			} else {
				setShowedMonthState(changedValue);
			}
		},
		[isControlledShowedMonth, onShowedMonthChange],
	);

	const monthOptions = useMemo(() => {
		const monthNames = monthsNames(language);
		const maxMonth = (() => {
			if (maxDate && year === showedMonth?.getFullYear()) {
				return (maxDate?.getMonth() ?? 0) + 1;
			}

			return monthNames.length;
		})();

		return monthNames.slice(0, maxMonth).map((monthName, index) => {
			return {
				label: monthName,
				value: index,
			};
		});
	}, [maxDate, showedMonth, language]);

	const displayValue = intlFormatDate(value, language);

	const navigateMonth = (increment: number) => {
		const newMonth = new Date(showedMonth);
		newMonth.setMonth(newMonth.getMonth() + increment);
		handleShowedMonthChange(newMonth);
	};

	const handleDateClick = (date: Date) => {
		// Skip if date is disabled (outside min/max range)
		if ((minDate && date < minDate) || (maxDate && date > maxDate)) {
			return;
		}

		onChange(date);
	};

	// Navigation guards for month switching based on min/max constraints
	const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
	const prevMonthStart = new Date(showedMonth.getFullYear(), showedMonth.getMonth() - 1, 1);
	const nextMonthStart = new Date(showedMonth.getFullYear(), showedMonth.getMonth() + 1, 1);
	const prevDisabled = !!minDate && prevMonthStart < startOfMonth(minDate);
	const nextDisabled = !!maxDate && nextMonthStart > startOfMonth(maxDate);

	const placeholderText = placeholder || translate(language, "datePicker.selectDate", "Select date");

	return (
		<div className={classNames("flex", direction === "row" ? "flex-row gap-4" : "flex-col", className)}>
			{label && (
				<label
					htmlFor={name}
					className={classNames(
						"block text-neutral-700",
						direction === "row" ? "flex items-center flex-shrink-0 w-32 text-sm" : "text-xs mb-1",
						size === "md" && direction === "row" && "h-9.5",
						size === "sm" && direction === "row" && "h-8.5",
					)}
				>
					{required && <span className="text-danger-500 mr-1">*</span>}
					{label}
				</label>
			)}
			<div className={classNames(direction === "row" ? "flex-1" : "")}>
				<Popover
					id={name}
					trigger={
						<button
							type="button"
							disabled={disabled}
							className={classNames(
								"appearance-none flex items-center w-full px-3 py-2 border border-neutral-400/65 rounded-md focus:outline-none focus:shadow-none focus:border-[var(--color-primary)] text-sm text-left justify-between",
								disabled ? "bg-neutral-100 cursor-not-allowed" : "bg-surface cursor-pointer",
								error && "border-danger-500",
								success && "border-success-600",
								triggerClassName,
							)}
							onClick={(e) => {
								e.preventDefault();
								setIsOpen((prev) => !prev);
							}}
						>
							<div className="flex items-center gap-1">
								{prefixIcon}
								<span
									className={classNames(
										!displayValue && "text-neutral-400",
										disabled && "text-neutral-700",
										!disabled && displayValue && "text-neutral-800",
										size === "sm" && "text-xs",
									)}
								>
									{displayValue || placeholderText}
								</span>
							</div>

							{suffixIcon || <Icon icon="ri:calendar-line" className="text-md text-neutral-500" />}
						</button>
					}
					position="bottom-right"
					isOpen={isOpen}
					onOpenChange={(isOpenValue) => {
						setIsOpen(isOpenValue);

						// reset the showed month to the selected date value
						if (!isOpenValue && value) {
							handleShowedMonthChange(value);
						}
					}}
					className="w-60 sm:w-72"
					rootClassName="w-full"
					triggerClassName="w-full"
				>
					<div className="mb-4 flex items-center justify-between gap-2">
						<div
							onClick={() => {
								if (!prevDisabled) navigateMonth(-1);
							}}
							className={classNames(
								"rounded-full p-1",
								prevDisabled
									? "text-neutral-300 cursor-not-allowed"
									: "text-neutral-500 hover:bg-primary-100/70 cursor-pointer",
							)}
						>
							<Icon icon="ri-arrow-left-s-line" className="text-xl" />
						</div>

						{isSmallPhone || size === "sm" ? (
							<div className="text-sm text-neutral-700 text-center">
								{showedMonth.toLocaleString("default", {month: "long", year: "numeric"})}
							</div>
						) : (
							<div className="text-neutral-700 flex-1">
								<div className="flex items-center justify-center gap-2">
									<Select
										options={monthOptions}
										name={`${name}-month-options`}
										onChange={(value) => {
											const newDate = new Date(showedMonth);
											newDate.setMonth(value);

											if (minDate && newDate < minDate) {
												newDate.setMonth(newDate.getMonth());
											}

											handleShowedMonthChange(newDate);
										}}
										className="grow"
										value={showedMonth.getMonth()}
										language={language}
									/>
									<Select
										options={yearOptions}
										name={`${name}-year-options`}
										onChange={(value) => {
											const newDate = new Date(showedMonth);
											newDate.setFullYear(value);

											if (maxDate && newDate > maxDate) {
												newDate.setMonth(maxDate.getMonth());
											}

											handleShowedMonthChange(newDate);
										}}
										value={showedMonth.getFullYear()}
										language={language}
									/>
								</div>
							</div>
						)}
						<div
							onClick={() => {
								if (!nextDisabled) navigateMonth(1);
							}}
							className={classNames(
								"rounded-full p-1",
								nextDisabled
									? "text-neutral-300 cursor-not-allowed"
									: "text-neutral-500 hover:bg-primary-100/70 cursor-pointer",
							)}
						>
							<Icon icon="ri-arrow-right-s-line" className="text-xl" />
						</div>
					</div>

					<div className="grid grid-cols-7 gap-1 text-center text-xs text-neutral-500">
						{shortWeekNames(language).map((day, i) => (
							<div key={i} className="py-1 font-medium">
								{isSmallPhone ? day.slice(0, 2) : day}
							</div>
						))}
					</div>

					<div className="mt-2 grid grid-cols-7 gap-2 pb-2">
						<GeneratedDays
							currentMonth={showedMonth}
							handleDateClick={handleDateClick}
							maxDate={maxDate}
							minDate={minDate}
							dateRange={{startDate: value, endDate: null}}
							size={size}
							dateClassName={dateClassName}
						/>
					</div>
					<div className="mt-4 flex justify-end border-t pt-3 gap-x-2 border-neutral-200 pb-1">
						{isClearable && (
							<Button
								className="!rounded-md cursor-pointer"
								size="sm"
								variant="outlined"
								onClick={() => {
									onChange(null);
									setIsOpen(false);
								}}
							>
								{translate(language, "common.clear", "Clear")}
							</Button>
						)}
						<Button
							className="!rounded-md cursor-pointer"
							size="sm"
							variant="filled"
							onClick={() => {
								setIsOpen(false);
							}}
							disabled={!value}
						>
							{translate(language, "common.save", "Save")}
						</Button>
					</div>
				</Popover>
				{message && <Caption className="text-neutral-600 mt-1">{message}</Caption>}
				{typeof error === "string" && error && <Caption className="text-danger-500 mt-1">{error}</Caption>}
				{success && <Caption className="text-success-700 mt-1">{success}</Caption>}
			</div>
		</div>
	);
};
