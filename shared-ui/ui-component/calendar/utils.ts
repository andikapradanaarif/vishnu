import { Time } from "../../constants/time";
import type { CalendarView } from "../../types/calendar";
import {
	addDays,
	addMonths,
	addWeeks,
	addYears,
	formatDate,
	formatMonthYear,
	formatYear,
	getEndOfDay,
	getEndOfMonth,
	getEndOfWeek,
	getEndOfYear,
	getStartOfDay,
	getStartOfMonth,
	getStartOfWeek,
	getStartOfYear,
} from "../../utils/date";
import { HOUR_HEIGHT, type CalendarEvent } from "./type";

export const getTitle = (view: CalendarView, date: Date) => {
	switch (view) {
		case "day":
			return formatDate(date);
		case "week": {
			const ws = getStartOfWeek(date);
			const we = addDays(ws, 6);
			if (ws.getMonth() === we.getMonth()) {
				return `${ws.toLocaleDateString("en-US", { month: "long" })} ${ws.getFullYear()}`;
			}
			return `${ws.toLocaleDateString("en-US", { month: "short" })} - ${we.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
		}
		case "month":
			return formatMonthYear(date);
		case "year":
			return formatYear(date);
	}
};

export const isSameDay = (a: Date, b: Date): boolean =>
	a.getFullYear() === b.getFullYear() &&
	a.getMonth() === b.getMonth() &&
	a.getDate() === b.getDate();

export const HOURS = Array.from({ length: Time.HOURS_IN_DAY }, (_, i) => i);

export const isAllDay = (event: CalendarEvent): boolean => {
	if (event.allDay) return true;
	const s = new Date(event.start);
	const e = new Date(event.end);
	return s.getHours() === 0 && s.getMinutes() === 0 && e.getHours() === 23 && e.getMinutes() === 59;
};

/** Compute overlapping columns for timed events in a day */
export const computeColumns = (
	events: CalendarEvent[],
): Map<string, { col: number; totalCols: number }> => {
	const sorted = [...events].sort(
		(a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
	);
	const result = new Map<string, { col: number; totalCols: number }>();
	const groups: CalendarEvent[][] = [];

	for (const event of sorted) {
		let placed = false;
		for (const group of groups) {
			const overlaps = group.some(
				(g) => new Date(g.start) < new Date(event.end) && new Date(g.end) > new Date(event.start),
			);
			if (overlaps) {
				group.push(event);
				placed = true;
				break;
			}
		}
		if (!placed) groups.push([event]);
	}

	for (const group of groups) {
		const cols: CalendarEvent[][] = [];
		for (const event of group) {
			let placed = false;
			for (let ci = 0; ci < cols.length; ci++) {
				const colEvents = cols[ci];
				const overlaps = colEvents.some(
					(g) => new Date(g.start) < new Date(event.end) && new Date(g.end) > new Date(event.start),
				);
				if (!overlaps) {
					cols[ci].push(event);
					result.set(event.id, { col: ci, totalCols: 0 });
					placed = true;
					break;
				}
			}
			if (!placed) {
				cols.push([event]);
				result.set(event.id, { col: cols.length - 1, totalCols: 0 });
			}
		}
		for (const event of group) {
			const info = result.get(event.id);
			if (info) info.totalCols = cols.length;
		}
	}

	return result;
};

export const getMonthGrid = (date: Date) => {
	const monthEnd = getEndOfMonth(date);
	const monthStart = getStartOfMonth(date);
	const gridStart = getStartOfWeek(monthStart);

	// Build up-to-6-week grid — months like May 2026 span 6 calendar rows.
	const weeks: Date[][] = [];
	let current = gridStart;

	// Continue looping as long as we haven't passed the end of the month,
	// AND we haven't hit our 6-week maximum limit.
	while (current <= monthEnd && weeks.length < 6) {
		const week: Date[] = [];
		for (let i = 0; i < 7; i++) {
			week.push(new Date(current));
			current = addDays(current, 1);
		}
		weeks.push(week);
		if (weeks.length >= 6) break;
	}

	return weeks;
};

export const getDayEvents = (day: Date, events: CalendarEvent[] = []): CalendarEvent[] => {
	const dayStart = getStartOfDay(day);
	const dayEnd = getEndOfDay(day);
	return events.filter((e) => {
		const eStart = new Date(e.start);
		const eEnd = new Date(e.end);
		return eStart <= dayEnd && eEnd >= dayStart;
	});
};

export function getEventPosition(event: CalendarEvent, day: Date): { top: number; height: number } {
	const dayStart = getStartOfDay(day);
	const dayEnd = getEndOfDay(day);
	const eStart = new Date(event.start) < dayStart ? dayStart : new Date(event.start);
	const eEnd = new Date(event.end) > dayEnd ? dayEnd : new Date(event.end);

	const startMinutes = eStart.getHours() * Time.MINUTES_IN_HOUR + eStart.getMinutes();
	const endMinutes = eEnd.getHours() * Time.MINUTES_IN_HOUR + eEnd.getMinutes();
	const durationMinutes = Math.max(endMinutes - startMinutes, 30);

	return {
		top: (startMinutes / Time.MINUTES_IN_HOUR) * HOUR_HEIGHT,
		height: (durationMinutes / Time.MINUTES_IN_HOUR) * HOUR_HEIGHT,
	};
}

/** Returns true if the day falls outside the [minDate, maxDate] bounds. */
export const getIsDayDisabled = (
	day: Date,
	minDate: Date | undefined,
	maxDate: Date | undefined,
): boolean => {
	if (minDate) {
		const start = getStartOfDay(minDate);
		if (day < start) return true;
	}

	if (maxDate) {
		const end = getEndOfDay(maxDate);
		if (day > end) return true;
	}

	return false;
};

/** Returns the date offset by one navigation unit for the given view and direction. */
export const getAdjacentDate = (date: Date, view: CalendarView, direction: -1 | 1): Date => {
	switch (view) {
		case "day":
			return addDays(date, direction);
		case "week":
			return addWeeks(date, direction);
		case "month":
			return addMonths(date, direction);
		case "year":
			return addYears(date, direction);
		default:
			return date;
	}
};

/** Returns the start and end of the period containing `date`, based on the view. */
export const getPeriodBounds = (date: Date, view: CalendarView): { start: Date; end: Date } => {
	switch (view) {
		case "day":
			return { start: getStartOfDay(date), end: getEndOfDay(date) };
		case "week":
			return { start: getStartOfWeek(date), end: getEndOfWeek(date) };
		case "month":
			return { start: getStartOfDay(getStartOfMonth(date)), end: getEndOfDay(getEndOfMonth(date)) };
		case "year":
			return { start: getStartOfYear(date), end: getEndOfYear(date) };
	}
};
