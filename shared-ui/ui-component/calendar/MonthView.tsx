import classNames from "classnames";
import { formatTime, getEndOfDay, getStartOfDay, shortWeekNames } from "../../utils/date";
import { COLORS, type CalendarEvent } from "./type";
import { isSameDay, isAllDay, getMonthGrid, getIsDayDisabled } from "./utils";
import { useMemo } from "react";
import { Time } from "../../constants/time";
import { translate } from "../../utils/translation";
import type { Language } from "../../types/translations";

type MonthViewItem = CalendarEvent & {
	startTime: number;
	endTime: number;
	isMulti: boolean;
};

interface MonthViewProps {
	date: Date;
	events: CalendarEvent[];
	onDayClick: (date: Date) => void;
	onEventClick: (event: CalendarEvent) => void;
	language?: Language;
	minDate?: Date;
	maxDate?: Date;
}

export const MonthView = (props: MonthViewProps) => {
	const { date, events, onDayClick, onEventClick, language = "en", minDate, maxDate } = props;

	const layoutData = useMemo(() => {
		const today = new Date();
		const weeksGrid = getMonthGrid(date);

		if (!weeksGrid.length) return [];

		const visibleStart = getStartOfDay(weeksGrid[0][0]).getTime();
		const visibleEnd = getEndOfDay(weeksGrid[weeksGrid.length - 1][6]).getTime();
		const MAX_VISIBLE = 3; // Total allowed slots per cell (multi + timed)

		const processedEvents = events.reduce((acc, ev) => {
			const startTime = new Date(ev.start).getTime();
			const endTime = new Date(ev.end).getTime();

			if (startTime <= visibleEnd && endTime >= visibleStart) {
				acc.push({
					...ev,
					startTime,
					endTime,
					isMulti: isAllDay(ev) || endTime - startTime >= Time.MILLISECONDS_IN_24HOURS,
				});
			}
			return acc;
		}, [] as MonthViewItem[]);

		return weeksGrid.map((week) => {
			const weekStart = getStartOfDay(week[0]).getTime();
			const weekEnd = getEndOfDay(week[6]).getTime();

			const weekEvents = processedEvents.filter(
				(ev) => ev.startTime <= weekEnd && ev.endTime >= weekStart,
			);

			const multiEvents = weekEvents.filter((ev) => ev.isMulti);
			const singleEvents = weekEvents.filter((ev) => !ev.isMulti);

			multiEvents.sort((a, b) => a.startTime - b.startTime || b.endTime - a.endTime);

			const rowEndDayIdx = new Map<number, number>();
			const multiDayLayout = multiEvents.map((ev) => {
				const firstDayIdx = Math.max(
					0,
					week.findIndex((wd) => ev.startTime <= getEndOfDay(wd).getTime()),
				);
				const lastDayIdx = week.findLastIndex((wd) => ev.endTime >= getStartOfDay(wd).getTime());
				const actualLastDayIdx = lastDayIdx === -1 ? 6 : lastDayIdx;

				let row = 0;
				while (rowEndDayIdx.has(row) && rowEndDayIdx.get(row)! >= firstDayIdx) {
					row++;
				}
				rowEndDayIdx.set(row, actualLastDayIdx);

				return {
					ev,
					row,
					leftPct: (firstDayIdx / 7) * 100,
					widthPct: ((actualLastDayIdx - firstDayIdx + 1) / 7) * 100,
				};
			});

			// Cap the spacer so we don't push timed events out of the cell entirely
			const maxMultiRow =
				multiDayLayout.length > 0 ? Math.max(...multiDayLayout.map((l) => l.row)) + 1 : 0;
			const cappedMaxMultiRow = Math.min(maxMultiRow, MAX_VISIBLE);

			// Calculate EXACT events per day cell
			const days = week.map((day) => {
				const dayStart = getStartOfDay(day).getTime();
				const dayEnd = getEndOfDay(day).getTime();

				const dayTimedEvents = singleEvents.filter(
					(ev) => ev.startTime <= dayEnd && ev.endTime >= dayStart,
				);

				const dayMultiEvents = multiDayLayout.filter(
					(l) => l.ev.startTime <= dayEnd && l.ev.endTime >= dayStart,
				);

				// How many multi-day events are physically drawn on this day?
				const visibleMultiCount = dayMultiEvents.filter((l) => l.row < MAX_VISIBLE).length;

				// How many timed events can we fit in the remaining space?
				const availableTimedSlots = Math.max(0, MAX_VISIBLE - cappedMaxMultiRow);
				const visibleTimedEvents = dayTimedEvents.slice(0, availableTimedSlots);

				const totalVisibleOnDay = visibleMultiCount + visibleTimedEvents.length;
				const totalEventsOnDay = dayMultiEvents.length + dayTimedEvents.length;

				// The true overflow count
				const hiddenCount =
					totalEventsOnDay > totalVisibleOnDay ? totalEventsOnDay - totalVisibleOnDay : 0;

				return {
					day,
					isCurrentMonth: day.getMonth() === date.getMonth(),
					isToday: isSameDay(day, today),
					isDisabled: getIsDayDisabled(day, minDate, maxDate),
					visibleTimedEvents,
					hiddenCount,
				};
			});

			return { days, multiDayLayout, cappedMaxMultiRow, MAX_VISIBLE };
		});
	}, [date, events, minDate, maxDate]);

	return (
		<div className="flex flex-col h-full bg-white pb-4">
			{/* Day headers */}
			<div className="grid grid-cols-7 border-b border-neutral-200 shrink-0">
				{shortWeekNames(language).map((d) => (
					<div
						key={d}
						className="py-2 text-center text-xs font-medium text-neutral-400 uppercase tracking-wider"
					>
						{d}
					</div>
				))}
			</div>

			{/* Weeks Grid */}
			<div
				className="flex-1 grid overflow-y-auto"
				style={{ gridTemplateRows: `repeat(${layoutData.length}, minmax(0, 1fr))` }}
			>
				{layoutData.map((week, wi) => (
					<div
						key={wi}
						className="relative flex border-b border-neutral-200 last:border-b-0 min-h-[110px]"
					>
						{/* Absolute Multi-Day Layer */}
						<div className="absolute inset-0 z-10 pointer-events-none mt-7">
							{week.multiDayLayout.map(({ ev, row, leftPct, widthPct }) => {
								if (row > 2) return null; // Only show top 3 to prevent overflowing cell height

								return (
									<button
										key={ev.id}
										onClick={(e) => {
											e.stopPropagation();
											onEventClick(ev);
										}}
										className="cursor-pointer absolute pointer-events-auto text-left px-1.5 py-0.5 rounded text-xs font-medium text-white truncate hover:opacity-90 transition-opacity"
										style={{
											backgroundColor: ev.color ?? COLORS.blue,
											top: row * 22, // 22px per row
											height: 20,
											left: `calc(${leftPct}% + 4px)`,
											width: `calc(${widthPct}% - 8px)`,
										}}
									>
										{ev.title}
									</button>
								);
							})}
						</div>

						{/* Days & Timed Events Layer */}
						{week.days.map(
							({ day, isCurrentMonth, isToday, isDisabled, visibleTimedEvents, hiddenCount }) => (
								<div
									key={day.toISOString()}
									className={classNames(
										"flex-1 h-full border-r border-neutral-200 last:border-r-0 p-1 transition-colors flex flex-col",
										!isCurrentMonth && "bg-neutral-50/50 opacity-50",
										isDisabled
											? "cursor-not-allowed opacity-50"
											: "hover:bg-neutral-50 cursor-pointer",
									)}
									aria-disabled={isDisabled || undefined}
									onClick={() => !isDisabled && onDayClick(day)}
								>
									{/* Day number */}
									<div className="flex justify-end mb-1 z-20">
										<span
											className={classNames(
												"text-xs w-6 h-6 flex items-center justify-center rounded-full font-medium",
												isDisabled
													? "text-neutral-400"
													: isToday
														? "bg-primary-600 text-white"
														: "text-neutral-600",
											)}
										>
											{day.getDate()}
										</span>
									</div>

									{/* Exact spacer height based on capped multi-day rows */}
									<div style={{ height: week.cappedMaxMultiRow * 22 }} />

									{/* Timed Events */}
									<div className="flex flex-col gap-0.5 z-20">
										{visibleTimedEvents.map((ev) => (
											<button
												key={ev.id}
												onClick={(e) => {
													e.stopPropagation();
													onEventClick(ev);
												}}
												className="cursor-pointer flex items-center gap-1.5 text-left w-full group py-0.5 px-1 rounded hover:bg-neutral-100"
											>
												<span
													className="w-1.5 h-1.5 rounded-full shrink-0"
													style={{ backgroundColor: ev.color ?? COLORS.blue }} // Ensure COLORS is defined
												/>
												<span className="text-xs text-neutral-600 group-hover:text-neutral-900 font-medium">
													{formatTime(new Date(ev.start))} {ev.title}
												</span>
											</button>
										))}

										{/* Accurate overflow indicator */}
										{hiddenCount > 0 && (
											<span className="text-xs text-neutral-400 pl-1 mt-0.5 font-medium">
												{translate(language, "calendar.more", "+{count} more", {
													count: String(hiddenCount),
												})}
											</span>
										)}
									</div>
								</div>
							),
						)}
					</div>
				))}
			</div>
		</div>
	);
};
