import {useCallback, useMemo, useState} from "react";
import classNames from "classnames";
import {Button} from "../button/Button";
import {Icon} from "@iconify/react";
import {intlFormatDate, getStartOfDay, listYears, monthsNames, shortWeekNames} from "../../utils/date";
import type {DateRangePickerProps} from "./types";
import GeneratedDays from "./GeneratedDays";
import Popover from "../popover/Popover";
import Select from "./Select";
import {useIsSmallPhone} from "../../hooks/useScreenSize";
import Caption from "../text/Caption";
import {translate} from "../../utils/translation";

const year = new Date().getFullYear();

export const DateRangePicker = (props: DateRangePickerProps) => {
	const {
		onDateRangeChange,
		placeholder,
		className = "",
		maxDate,
		minDate,
		startDate = null,
		endDate = null,
		name,
		isClearable = false,
		disabled,
		error,
		label,
		direction = "row",
		size = "md",
		required = false,
		message,
		success,
		dateClassName,
		showedMonth: showedMonthProps,
		onShowedMonthChange,
		language = "en",
	} = props;

	const isSmallPhone = useIsSmallPhone();
	const [isOpen, setIsOpen] = useState(false);
	const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(startDate);
	const [showedMonthState, setShowedMonthState] = useState(startDate ?? new Date());
	const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

	const isControlledShowedMonth = showedMonthProps !== undefined;
	const showedMonth = showedMonthProps ?? showedMonthState;

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

	const monthOptions = useMemo(
		() =>
			monthsNames(language).map((monthName, index) => {
				return {
					label: monthName,
					value: index,
				};
			}),
		[language],
	);

	const handleDateClick = (date: Date) => {
		if ((minDate && date < minDate) || (maxDate && date > maxDate)) {
			return;
		}

		// If no start date OR already completed range → start new range
		if (!selectedStartDate || endDate) {
			setHoveredDate(null);
			setSelectedStartDate(date);
			onDateRangeChange({startDate: getStartOfDay(date), endDate: null});
			return;
		}

		// If selecting end date
		if (selectedStartDate) {
			let newStart = selectedStartDate;
			let newEnd = date;

			if (date < selectedStartDate) {
				newStart = date;
				newEnd = selectedStartDate;
			}

			setSelectedStartDate(newStart);

			onDateRangeChange({
				startDate: getStartOfDay(newStart),
				endDate: getStartOfDay(newEnd),
			});
		}
	};

	const navigateMonth = (increment: number) => {
		const newMonth = new Date(showedMonth);
		newMonth.setMonth(newMonth.getMonth() + increment);
		handleShowedMonthChange(newMonth);
	};

	// Navigation guards for month switching based on min/max constraints
	const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
	const prevMonthStart = new Date(showedMonth.getFullYear(), showedMonth.getMonth() - 1, 1);
	const nextMonthStart = new Date(showedMonth.getFullYear(), showedMonth.getMonth() + 1, 1);
	const prevDisabled = !!minDate && prevMonthStart < startOfMonth(minDate);
	const nextDisabled = !!maxDate && nextMonthStart > startOfMonth(maxDate);

	const displayValue = startDate
		? endDate
			? `${intlFormatDate(startDate, language)} → ${intlFormatDate(endDate, language)}`
			: `${intlFormatDate(startDate, language)} → `
		: "";

	const placeholderText = placeholder || translate(language, "dateRangePicker.selectDate", "Select date");

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
								"appearance-none flex items-center w-full px-3 py-2 border border-neutral-400/65 rounded-md focus:outline-none focus:shadow-none focus:border-[var(--color-primary)] text-sm text-left",
								disabled ? "bg-neutral-100 cursor-not-allowed" : "bg-white cursor-pointer",
								error && "border-danger-500",
								success && "border-success-600",
							)}
							onClick={(e) => {
								e.preventDefault();
								setIsOpen((prev) => !prev);
							}}
						>
							<span
								className={classNames(
									"flex-1",
									!displayValue && "text-neutral-400",
									disabled && "text-neutral-700",
									!disabled && displayValue && "text-neutral-800",
									size === "sm" && "text-xs",
								)}
							>
								{displayValue || placeholderText}
							</span>
							<Icon icon="ri:calendar-line" className="text-md text-neutral-500" />
						</button>
					}
					position="bottom-right"
					isOpen={isOpen && !disabled}
					onOpenChange={(value) => {
						if (!disabled) {
							setIsOpen(value);

							// handle close - clear temporary selection state only
							if (selectedStartDate && endDate === null) {
								setSelectedStartDate(null);
								setHoveredDate(null);
								onDateRangeChange({
									startDate: null,
									endDate: null,
								});
							}

							// handle close - reset the showed month after closing the date range picker
							if (!value && selectedStartDate) {
								handleShowedMonthChange(selectedStartDate);
							}
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

					<div className="mt-2 grid grid-cols-7 gap-2">
						<GeneratedDays
							currentMonth={showedMonth}
							dateRange={{startDate: selectedStartDate, endDate}}
							handleDateClick={handleDateClick}
							maxDate={maxDate}
							minDate={minDate}
							size={size}
							hoveredDate={hoveredDate}
							setHoveredDate={setHoveredDate}
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
									setSelectedStartDate(null);
									onDateRangeChange({startDate: null, endDate: null});
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
							disabled={!selectedStartDate || !endDate}
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
