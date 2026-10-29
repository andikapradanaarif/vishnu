import classNames from "classnames";
import { monthsNames, shortWeekNames } from "../../utils/date";
import type { CalendarEvent } from "./type";
import { getMonthGrid, isSameDay, getIsDayDisabled } from "./utils";
import { useMemo } from "react";

interface YearViewProps {
	date: Date;
	events: CalendarEvent[];
	onMonthClick: (date: Date) => void;
	onDayClick: (date: Date) => void;
	language?: string;
	minDate?: Date;
	maxDate?: Date;
}

interface MiniMonthProps {
	year: number;
	monthIndex: number;
	today: Date;
	selectedDate: Date;
	daysWithEvents: Set<string>; // Replaced 'events' with a highly optimized Set
	onMonthClick: (date: Date) => void;
	onDayClick: (date: Date) => void;
	language?: string;
	minDate?: Date;
	maxDate?: Date;
}

const MiniMonth = (props: MiniMonthProps) => {
	const {
		year,
		monthIndex,
		today,
		selectedDate,
		daysWithEvents,
		onMonthClick,
		onDayClick,
		language = "en",
		minDate,
		maxDate,
	} = props;

	const monthDate = useMemo(() => new Date(year, monthIndex, 1), [monthIndex, year]);
	const weeks = useMemo(() => getMonthGrid(monthDate), [monthDate]);

	const isMonthDisabled = useMemo(() => {
		const daysInMonth = weeks.flat().filter((day) => day.getMonth() === monthIndex);
		return daysInMonth.every((day) => getIsDayDisabled(day, minDate, maxDate));
	}, [weeks, monthIndex, minDate, maxDate]);

	return (
		<div className="flex flex-col">
			<button
				type="button"
				disabled={isMonthDisabled}
				onClick={() => onMonthClick(monthDate)}
				className={classNames(
					"text-left text-sm font-medium mb-2 transition-colors",
					isMonthDisabled
						? "text-neutral-300 cursor-not-allowed"
						: "text-neutral-700 hover:text-primary-600 cursor-pointer",
				)}
			>
				{monthsNames(language)[monthIndex]}
			</button>

			{/* Day headers */}
			<div className="grid grid-cols-7 mb-1">
				{shortWeekNames(language).map((d) => (
					<div key={d} className="text-center text-neutral-400 leading-none text-xs font-medium">
						{d[0]}
					</div>
				))}
			</div>

			{/* Weeks Grid */}
			<div className="flex flex-col gap-1">
				{weeks.map((week, wi) => (
					<div key={wi} className="grid grid-cols-7 gap-1">
						{week.map((day) => {
							const isCurrentMonth = day.getMonth() === monthIndex;
							const isToday = isSameDay(day, today);
							const isSelected = isSameDay(day, selectedDate);

							const dateKey = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
							const hasEvent = daysWithEvents.has(dateKey);
							const isDisabled = getIsDayDisabled(day, minDate, maxDate);

							return (
								<button
									key={day.toISOString()}
									type="button"
									disabled={isDisabled}
									onClick={() => onDayClick(day)}
									className={classNames(
										"relative flex items-center justify-center rounded transition-colors w-full text-xs h-7",
										isDisabled
											? "text-neutral-300 cursor-not-allowed"
											: isToday
												? "bg-primary-600 text-white font-medium"
												: isSelected
													? "bg-neutral-200 text-neutral-900 font-medium"
													: isCurrentMonth
														? "text-neutral-700 hover:bg-neutral-100"
														: "text-neutral-300",
									)}
								>
									<span>{day.getDate()}</span>

									{/* Event Indicator Dot */}
									{hasEvent && isCurrentMonth && !isToday && (
										<span
											className={classNames(
												"absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full",
												isDisabled ? "bg-neutral-300" : "bg-primary-500",
											)}
										/>
									)}
									{hasEvent && isCurrentMonth && isToday && (
										<span
											className={classNames(
												"absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full",
												isDisabled ? "bg-neutral-300" : "bg-white",
											)}
										/>
									)}
								</button>
							);
						})}
					</div>
				))}
			</div>
		</div>
	);
};

export const YearView = (props: YearViewProps) => {
	const { date, events, onMonthClick, onDayClick, language = "en", minDate, maxDate } = props;
	const year = date.getFullYear();

	const today = useMemo(() => new Date(), []);

	const daysWithEvents = useMemo(() => {
		const activeDays = new Set<string>();

		// Determine the absolute boundaries of the viewed year to ignore irrelevant events
		const yearStartMs = new Date(year, 0, 1).getTime();
		const yearEndMs = new Date(year, 11, 31, 23, 59, 59).getTime();

		for (const ev of events) {
			const evStartMs = new Date(ev.start).getTime();
			const evEndMs = new Date(ev.end).getTime();

			// Skip events completely outside this year
			if (evEndMs < yearStartMs || evStartMs > yearEndMs) continue;

			// Extract the exact days this event touches
			const currentDay = new Date(ev.start);
			currentDay.setHours(0, 0, 0, 0);

			const lastDay = new Date(ev.end);
			lastDay.setHours(0, 0, 0, 0);

			// Walk through the event's duration day-by-day and add it to our Set
			while (currentDay.getTime() <= lastDay.getTime()) {
				const key = `${currentDay.getFullYear()}-${currentDay.getMonth()}-${currentDay.getDate()}`;
				activeDays.add(key);

				// Move to the next day
				currentDay.setDate(currentDay.getDate() + 1);
			}
		}

		return activeDays;
	}, [events, year]);

	return (
		<div className="flex-1 overflow-y-auto p-6 bg-white">
			<div className="grid grid-cols-4 gap-8 max-xl:grid-cols-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
				{Array.from({ length: 12 }, (_, i) => (
					<MiniMonth
						key={i}
						year={year}
						monthIndex={i}
						today={today}
						selectedDate={date}
						daysWithEvents={daysWithEvents}
						onMonthClick={onMonthClick}
						onDayClick={onDayClick}
						language={language}
						minDate={minDate}
						maxDate={maxDate}
					/>
				))}
			</div>
		</div>
	);
};
