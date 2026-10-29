import { Time } from "../constants/time";

type Precision = "second" | "minute" | "hour" | "day";
type DateInput = Date | string | number;

const normalizeIsoTimestamp = (value: string): string =>
	value.replace(/\.(\d{3})\d+([zZ]|[+-]\d{2}:?\d{2})$/, ".$1$2");

const parseDateInput = (value: DateInput): Date => {
	if (value instanceof Date) {
		return new Date(value);
	}

	if (typeof value === "string") {
		return new Date(normalizeIsoTimestamp(value));
	}

	return new Date(value);
};

const factors = {
	second: Time.MILLISECONDS_IN_SECOND,
	minute: Time.MILLISECONDS_IN_SECOND * Time.SECONDS_IN_MINUTE,
	hour: Time.MILLISECONDS_IN_SECOND * Time.SECONDS_IN_MINUTE * Time.MINUTES_IN_HOUR,
	day:
		Time.MILLISECONDS_IN_SECOND * Time.SECONDS_IN_MINUTE * Time.MINUTES_IN_HOUR * Time.HOURS_IN_DAY,
};

/**
 * Checks whether two Date objects represent the same time up to a given precision.
 *
 * The comparison is done by truncating both dates to the specified precision
 * (hour, minute, or second) and comparing their timestamps.
 *
 * @param d1 - The first date to compare
 * @param d2 - The second date to compare
 * @param precision - The level of precision to compare at.
 *   - `'hour'`   → compares hour
 *   - `'minute'` → compares up to the minute
 *   - `'second'` → compares up to the second (default)
 *
 * @returns `true` if both dates are equal at the specified precision, otherwise `false`
 *
 * @example
 * isSameTime(
 *   new Date('2026-02-06T10:15:30.500Z'),
 *   new Date('2026-02-06T10:15:30.900Z')
 * ); // true (second precision)
 *
 * @example
 * isSameTime(
 *   new Date('2026-02-06T10:15:30Z'),
 *   new Date('2026-02-06T10:16:00Z'),
 *   'minute'
 * ); // false
 */
export const isSameTime = (d1: Date, d2: Date, precision: Precision = "second"): boolean => {
	const factor = factors[precision];

	// Get the timezone offset in milliseconds (e.g., GMT+7 is -420 minutes)
	// subtract it because getTimezoneOffset() returns positive for West and negative for East
	const offset = d1.getTimezoneOffset() * Time.SECONDS_IN_MINUTE * Time.MILLISECONDS_IN_SECOND;

	const t1 = d1.getTime() - offset;
	const t2 = d2.getTime() - offset;

	return Math.floor(t1 / factor) === Math.floor(t2 / factor);
};

/**
 *  Internationalization function to format a date to a string in the format "MMM d, yyyy"
 */
export const intlFormatDate = (date: Date | null, language: string) => {
	if (!date) return "";

	return new Intl.DateTimeFormat(language, {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(date);
};

/**
 *  Internationalization function to format a date to a string in the format "ddd, dd MMM, HH:mm"
 */
export const intlFormatDateWithTime = (date: Date | null, language: string) => {
	if (!date) return "";

	const now = new Date();
	const isSameYear = date.getFullYear() === now.getFullYear();

	return new Intl.DateTimeFormat(language, {
		...(isSameYear ? {} : { year: "numeric" }),
		weekday: "short",
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "numeric",
	}).format(date);
};

/**
 * Get short week names
 */
export const shortWeekNames = (language: string = "en") =>
	[...Array(7).keys()].map((day) =>
		new Intl.DateTimeFormat(language, { weekday: "short" }).format(new Date(2024, 0, day + 7)),
	);

/**
 * Get month names
 */
export const monthsNames = (language: string = "en") =>
	Array.from({ length: 12 }, (_, i) =>
		new Intl.DateTimeFormat(language, { month: "long" }).format(new Date(2024, i, 1)),
	);

/**
 * Get list of years until now from the `startYear`
 * @param startYear
 * @returns
 */
export function getYearsUntilNow(startYear: number) {
	const currentYear = new Date().getFullYear();
	return Array.from({ length: currentYear - startYear + 1 }, (_, i) => startYear + i);
}

export function listYears(startYear: number, endYear: number) {
	return Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
}

/**
 * Get start of day (00:00:00.000)
 * @param date
 * @returns
 */
export function getStartOfDay(date: Date) {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	return d;
}

/**
 * Get end of day (23:59:59.999)
 * @param date
 * @returns
 */
export function getEndOfDay(date: Date) {
	const currentDate = new Date(date);
	currentDate.setHours(23, 59, 59, 999);
	return currentDate;
}

/**
 * Get the first date of the month
 * @param date
 * @returns
 */
export function getStartOfMonth(date: Date) {
	const currentDate = new Date(date);
	currentDate.setDate(1);
	return currentDate;
}

/**
 * Get the last date of the month
 * @param date
 * @returns
 */
export function getEndOfMonth(date: Date) {
	const currentDate = new Date(date);
	currentDate.setMonth(currentDate.getMonth() + 1, 0);
	return currentDate;
}

/**
 * Get the start of a week (Sunday)
 * @param date
 * @returns
 */
export const getStartOfWeek = (date: Date): Date => {
	const d = new Date(date);
	const day = d.getDay();
	d.setDate(d.getDate() - day);
	d.setHours(0, 0, 0, 0);
	return d;
};

/**
 * Get the end of a week (Saturday)
 * @param date
 * @returns
 */
export const getEndOfWeek = (date: Date): Date => {
	const d = new Date(date);
	const day = Time.DAYS_IN_WEEK - d.getDay() - 1;
	d.setDate(d.getDate() + day);
	d.setHours(23, 59, 59, 999);
	return d;
};

/**
 * Get the start of a year (Jan 1, 00:00:00.000)
 * @param date
 * @returns
 */
export const getStartOfYear = (date: Date): Date => {
	return new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0);
};

/**
 * Get the end of a year (Dec 31, 23:59:59.999)
 * @param date
 * @returns
 */
export const getEndOfYear = (date: Date): Date => {
	return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
};

/**
 * Gets a date that is a specified number of months before the given date (or current date if not provided)
 * @param months Number of months to go back
 * @param fromDate Optional date to start from (defaults to current date)
 * @returns New Date object representing the calculated date
 */
export function getDateBeforeMonths(months: number, fromDate: Date = new Date()): Date {
	const result = new Date(fromDate);
	result.setMonth(result.getMonth() - months);
	return result;
}

/**
 * Add the selected date by days
 * @param date
 * @param days
 * @returns
 */
export function addDays(date: Date, days: number): Date {
	const result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
}

/**
 * Subtract the selected date by days
 * @param date
 * @param days
 * @returns
 */
export function subDays(date: Date, days: number): Date {
	const result = new Date(date);
	result.setDate(result.getDate() - days);
	return result;
}

/**
 * Add the selected date by weeks
 * @param date
 * @param weeks
 * @returns
 */
export const addWeeks = (date: Date, weeks: number): Date =>
	addDays(date, weeks * Time.DAYS_IN_WEEK);

/**
 * Add the selected date by months
 * @param date
 * @param months
 * @returns
 */
export const addMonths = (date: Date, months: number): Date => {
	return new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
};

/**
 * Add the selected date by years
 * @param date
 * @param years
 * @returns
 */
export const addYears = (date: Date, years: number): Date => {
	return new Date(date.getFullYear() + years, date.getMonth(), date.getDate());
};

/**
 * Get Formatted Time String
 * @param date
 * @param withSeconds - include seconds in the output (default: true)
 * @returns formatted time string (HH:mm or HH:mm:ss)
 */
export function getFormattedTimeString(date: Date, withSeconds = true): string {
	const timeString = new Intl.DateTimeFormat("en-US", {
		hour: "2-digit",
		minute: "2-digit",
		...(withSeconds ? { second: "2-digit" } : {}),
		hour12: false,
	}).format(date);
	return timeString;
}

/**
 * get formatted date string YYYY-MM-DD
 * @param date
 * @returns
 */
export function getFormattedDateString(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");

	return `${year}-${month}-${day}`;
}

/**
 * Calculates and formats the duration between two dates as "HH:mm:ss".
 * @param fromDate - The start date.
 * @param toDate - The end date (defaults to the current time).
 */
export const getDurationBetweenDates = (fromDate: Date, toDate: Date = new Date()): string => {
	// Get the absolute difference in milliseconds
	const diffInMs = Math.abs(toDate.getTime() - fromDate.getTime());

	return formatDuration(diffInMs);
};

/**
 * Merges a date and a 24-hour time string into a single `Date` object.
 *
 * The resulting `Date` keeps the original date (year, month, day)
 * and applies the provided time in **local time**.
 *
 * @param date - The base date whose year, month, and day will be used
 * @param time - Time string in 24-hour format:
 *   - `HH` (e.g., `"17"`)
 *   - `HH:mm` (e.g., `"17:36"`)
 *   - `HH:mm:ss` (e.g., `"17:36:45"`)
 *
 * @returns A new `Date` instance with the merged date and time
 *
 * @throws {Error} If the time format is invalid or outside 24-hour range
 *
 * @example
 * ```ts
 * const date = new Date('2026-01-30');
 *
 * mergeDateAndTime(date, '17');
 * // → Fri Jan 30 2026 17:00:00 (local time)
 *
 * mergeDateAndTime(date, '17:36');
 * // → Fri Jan 30 2026 17:36:00 (local time)
 *
 * mergeDateAndTime(date, '17:36:45');
 * // → Fri Jan 30 2026 17:36:45 (local time)
 * ```
 */
const TIME_FORMATS = {
	HH: /^([01]\d|2[0-3])$/,
	HH_MM: /^([01]\d|2[0-3]):([0-5]\d)$/,
	HH_MM_SS: /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/,
};

export function mergeDateAndTime(date: Date, time: string): Date {
	let hours: number;
	let minutes = 0;
	let seconds = 0;

	if (TIME_FORMATS.HH_MM_SS.test(time)) {
		// Format: HH:mm:ss
		[hours, minutes, seconds] = time.split(":").map(Number);
	} else if (TIME_FORMATS.HH_MM.test(time)) {
		// Format: HH:mm
		[hours, minutes] = time.split(":").map(Number);
	} else if (TIME_FORMATS.HH.test(time)) {
		// Format: HH
		hours = Number(time);
	} else {
		throw new Error("Invalid time format. Expected HH, HH:mm, or HH:mm:ss");
	}

	const merged = new Date(date);
	merged.setHours(hours, minutes, seconds, 0);

	return merged;
}

/**
 * This function will output a localized string of the given date.
 */
export function formatDateToLocalizedString(
	date: DateInput,
	language: string = "en",
	translations?: Record<string, string>,
	withTime = false,
): string {
	const parsedDate = parseDateInput(date);
	const now = new Date();
	const formatter = new Intl.RelativeTimeFormat(language, { numeric: "auto" });

	if (Number.isNaN(parsedDate.getTime())) {
		return "-";
	}

	const dateStartOfDay = getStartOfDay(parsedDate).getTime();
	const nowStartOfDay = getStartOfDay(now).getTime();
	const calendarDiffDays = Math.round(
		(dateStartOfDay - nowStartOfDay) / Time.MILLISECONDS_IN_24HOURS,
	);

	const yearDiff = parsedDate.getFullYear() - now.getFullYear();
	if (yearDiff < 0) {
		return formatter.format(yearDiff, "year");
	}

	const monthDiff =
		(parsedDate.getFullYear() - now.getFullYear()) * 12 + (parsedDate.getMonth() - now.getMonth());
	if (monthDiff < 0) {
		return formatter.format(monthDiff, "month");
	}

	if (calendarDiffDays === -1) return translations?.["date.yesterday"] || "yesterday";
	if (calendarDiffDays === 0) return translations?.["date.today"] || "today";
	if (calendarDiffDays === 1) return translations?.["date.tomorrow"] || "tomorrow";

	if (calendarDiffDays <= -7) {
		const weekDiff = Math.ceil(calendarDiffDays / 7);
		return formatter.format(weekDiff, "week");
	}

	if (calendarDiffDays < -1) {
		return formatter.format(calendarDiffDays, "day");
	}

	const dateFormatter =
		parsedDate.getFullYear() === now.getFullYear()
			? new Intl.DateTimeFormat(language, { weekday: "short", day: "2-digit", month: "short" })
			: new Intl.DateTimeFormat(language, {
					weekday: "short",
					day: "2-digit",
					month: "short",
					year: "numeric",
				});
	if (withTime) {
		return `${dateFormatter.format(parsedDate)} ${new Intl.DateTimeFormat(language, { hour: "2-digit", minute: "2-digit" }).format(parsedDate)}`;
	}
	return dateFormatter.format(parsedDate);
}

/**
 * Pads a number with a leading zero if it is less than 10.
 *
 * @param n - The number to pad.
 * @returns A string of at least 2 characters, zero-padded if necessary.
 *
 * @example
 * // pad(5) → '05'
 * // pad(12) → '12'
 */
export function pad(n: number): string {
	return String(n).padStart(2, "0");
}

/**
 * Formats a duration in milliseconds to a "HH:mm:ss" string.
 * @param ms - The duration in milliseconds.
 */
export const formatDuration = (ms: number): string => {
	if (ms < 0) return "00:00:00";

	const totalSeconds = Math.floor(ms / Time.MILLISECONDS_IN_SECOND);

	const hours = Math.floor(totalSeconds / Time.SECONDS_IN_HOUR);
	const minutes = Math.floor((totalSeconds % Time.SECONDS_IN_HOUR) / Time.MINUTES_IN_HOUR);
	const seconds = totalSeconds % Time.SECONDS_IN_MINUTE;

	return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

/**
 * Returns a human-readable description of a date
 * relative to today (e.g. "today", "yesterday", "tomorrow").
 *
 * If the date is outside the relative range, a formatted
 * date string is returned instead.
 *
 * @param date - The date to describe.
 * @param now - Reference date (defaults to current date).
 * @param translations - Optional translation map for date strings.
 *
 * @returns A relative day description or a formatted date string.
 */
export function getDayDescription(
	date: Date,
	now: Date = new Date(),
	translations?: Record<string, string>,
): string {
	const target = getStartOfDay(date).getTime();
	const today = getStartOfDay(now).getTime();

	const diffInDays = Math.round(
		(target - today) /
			(Time.HOURS_IN_DAY *
				Time.MINUTES_IN_HOUR *
				Time.SECONDS_IN_MINUTE *
				Time.MILLISECONDS_IN_SECOND),
	);

	switch (diffInDays) {
		case 0:
			return translations?.["date.today"] || "today";
		case -1:
			return translations?.["date.yesterday"] || "yesterday";
		case 1:
			return translations?.["date.tomorrow"] || "tomorrow";
		default:
			return date.toLocaleDateString(undefined, {
				year: "numeric",
				month: "short",
				day: "numeric",
				weekday: "long",
			});
	}
}

/**
 * Returns the duration between two dates in milliseconds.
 */
export const getDurationMs = (start: Date, end: Date): number => {
	return new Date(end).getTime() - new Date(start).getTime();
};

/**
 * Formats a date to a 12-hour time string (e.g. `9am`, `2:30pm`).
 */
export const formatTime = (date: Date, locale: string = "en-GB"): string => {
	return new Intl.DateTimeFormat(locale, {
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
};

/**
 * Formats a date to a short readable string (e.g. `Mon, Jan 6`).
 */
export const formatDate = (date: Date): string => {
	return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
};

/**
 * Formats a date to a month and year string (e.g. `January 2025`).
 */
export const formatMonthYear = (date: Date): string => {
	return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

/**
 * Returns the four-digit year of a date as a string (e.g. `2025`).
 */
export const formatYear = (date: Date): string => {
	return date.getFullYear().toString();
};

/**
 * Formats a date range into a human-friendly string.
 *
 * Output adapts based on the relationship between `start` and `end`:
 *
 * - Same day (yesterday):
 *   → "yesterday, 16:00 - 16:30"
 *
 * - Same day (not yesterday):
 *   → "Thursday, 2 April 2026, 16:00 - 16:30"
 *
 * - Different days:
 *   → "Thursday, 2 April 2026 - Friday, 3 April 2026"
 *
 * - Only start date:
 *   → "Thursday, 2 April 2026"
 *
 * @param start - The start date of the range.
 * @param end - Optional end date of the range.
 * @param options - Optional configuration.
 * @param options.now - Reference date for relative calculations (e.g., "yesterday"). Defaults to current date.
 * @param options.locale - Locale for formatting. Defaults to "en-GB".
 *
 * @returns A formatted date or date range string.
 *
 * @example
 * formatDateRange(
 *   new Date('2026-04-01T16:00:00'),
 *   new Date('2026-04-01T16:30:00'),
 *   { now: new Date('2026-04-02') }
 * );
 * // "yesterday, 16:00 - 16:30"
 *
 * @example
 * formatDateRange(
 *   new Date('2026-04-02'),
 *   new Date('2026-04-03')
 * );
 * // "Thursday, 2 April 2026 - Friday, 3 April 2026"
 *
 * @example
 * formatDateRange(new Date('2026-04-02'));
 * // "Thursday, 2 April 2026"
 */
type FormatDateRangeOptions = {
	now?: Date;
	locale?: string;
	isAllDay?: boolean;
	translations?: Record<string, string>;
};

export function formatDateRange(
	start: Date,
	end?: Date,
	options: FormatDateRangeOptions = {},
): string {
	const { now = new Date(), locale = "en-GB", isAllDay = false, translations } = options;

	const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

	const formatFullDate = (date: Date) =>
		new Intl.DateTimeFormat(locale, {
			weekday: "long",
			day: "numeric",
			month: "long",
			year: "numeric",
		}).format(date);

	if (isAllDay) {
		if (end && !isSameDay(start, end)) {
			return `${formatFullDate(start)} - ${formatFullDate(end)}`;
		}

		return getDayDescription(start, now, translations);
	}

	if (end && isSameDay(start, end)) {
		return `${getDayDescription(start, now, translations)}, ${formatTime(start)} - ${formatTime(end)}`;
	}

	if (end) {
		return `${formatFullDate(start)} - ${formatFullDate(end)}`;
	}

	return formatFullDate(start);
}

/**
 * Rounds a date up to the nearest specified minute interval.
 *
 * @param date - The date to round. Defaults to the current date/time.
 * @param minutes - The minute interval to round up to (e.g. 15, 30, 60).
 * @returns A new Date rounded up to the nearest minute interval.
 *
 * @example
 * // roundUpToNearestByMinutes(new Date('2024-01-01T15:35'), 30) → 16:00
 * // roundUpToNearestByMinutes(new Date('2024-01-01T16:17'), 30) → 16:30
 * // roundUpToNearestByMinutes(new Date('2024-01-01T16:10'), 15) → 16:15
 */
export const roundUpToNearestByMinutes = (date: Date = new Date(), minutes: number): Date => {
	const ms = minutes * Time.SECONDS_IN_MINUTE * Time.MILLISECONDS_IN_SECOND;
	return new Date(Math.ceil(date.getTime() / ms) * ms);
};

/**
 * Rounds a date to the nearest specified minute interval (either up or down).
 *
 * @param date - The date to round. Defaults to the current date/time.
 * @param minutes - The minute interval to round to (e.g. 15, 30, 60).
 * @returns A new Date rounded to the closest minute interval.
 *
 * @example
 * // roundToNearestByMinutes(new Date('2024-01-01T15:07'), 15) → 15:00 (rounds down)
 * // roundToNearestByMinutes(new Date('2024-01-01T15:08'), 15) → 15:15 (rounds up)
 */
export const roundToNearestByMinutes = (date: Date = new Date(), minutes: number): Date => {
	const ms = minutes * Time.SECONDS_IN_MINUTE * Time.MILLISECONDS_IN_SECOND;
	return new Date(Math.round(date.getTime() / ms) * ms);
};

/**
 * Adds a specified number of hours to a date.
 *
 * @param date - The base date to add hours to.
 * @param hours - The number of hours to add. Can be negative to subtract.
 * @returns A new Date with the hours added.
 *
 * @example
 * // addHours(new Date('2024-01-01T10:00'), 2) → 12:00
 * // addHours(new Date('2024-01-01T10:00'), -3) → 07:00
 */
export const addHours = (date: Date, hours: number): Date => {
	return new Date(
		date.getTime() +
			hours * Time.MINUTES_IN_HOUR * Time.SECONDS_IN_MINUTE * Time.MILLISECONDS_IN_SECOND,
	);
};

/**
 * Formats a date to a relative label for date separators.
 * Returns: "Today" for today's messages, "Yesterday" for yesterday's messages, or formatted date (MMM d, yyyy) for older messages
 *
 * @param timestamp - The timestamp to format
 * @param language - Language for date formatting
 * @param translations - Optional translation map for date strings
 * @returns A localized relative date label or formatted date string
 */
export function formatRelativeDate(
	timestamp: number,
	language: string = "en",
	translations?: Record<string, string>,
): string {
	const messageDate = new Date(timestamp);
	const now = new Date();

	const target = getStartOfDay(messageDate).getTime();
	const today = getStartOfDay(now).getTime();
	const calendarDiffDays = Math.round((target - today) / Time.MILLISECONDS_IN_24HOURS);

	if (calendarDiffDays === 0) return translations?.["date.today"] || "today";
	if (calendarDiffDays === -1) return translations?.["date.yesterday"] || "yesterday";

	return intlFormatDate(messageDate, language);
}
