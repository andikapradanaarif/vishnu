import { describe, it, expect } from "bun:test";
import {
	isSameTime,
	getStartOfDay,
	getEndOfDay,
	getStartOfMonth,
	getEndOfMonth,
	getStartOfWeek,
	getEndOfWeek,
	getStartOfYear,
	getEndOfYear,
	addDays,
	subDays,
	addWeeks,
	addMonths,
	addYears,
	addHours,
	getDateBeforeMonths,
	getYearsUntilNow,
	listYears,
	getFormattedDateString,
	mergeDateAndTime,
	formatDuration,
	getDurationMs,
	getDurationBetweenDates,
	pad,
	roundUpToNearestByMinutes,
	roundToNearestByMinutes,
	formatYear,
	formatMonthYear,
} from "../date";

describe("isSameTime", () => {
	it("returns true for same timestamps at second precision", () => {
		const d1 = new Date("2026-02-06T10:15:30.500Z");
		const d2 = new Date("2026-02-06T10:15:30.900Z");
		expect(isSameTime(d1, d2, "second")).toBe(true);
	});

	it("returns false for different seconds at second precision", () => {
		const d1 = new Date("2026-02-06T10:15:30Z");
		const d2 = new Date("2026-02-06T10:15:31Z");
		expect(isSameTime(d1, d2, "second")).toBe(false);
	});

	it("compares at minute precision", () => {
		const d1 = new Date("2026-02-06T10:15:30Z");
		const d2 = new Date("2026-02-06T10:15:59Z");
		expect(isSameTime(d1, d2, "minute")).toBe(true);
	});

	it("returns false at minute precision for different minutes", () => {
		const d1 = new Date("2026-02-06T10:15:00Z");
		const d2 = new Date("2026-02-06T10:16:00Z");
		expect(isSameTime(d1, d2, "minute")).toBe(false);
	});

	it("compares at hour precision", () => {
		const d1 = new Date("2026-02-06T10:15:00Z");
		const d2 = new Date("2026-02-06T10:59:00Z");
		expect(isSameTime(d1, d2, "hour")).toBe(true);
	});

	it("defaults to second precision", () => {
		const d1 = new Date("2026-02-06T10:15:30.100Z");
		const d2 = new Date("2026-02-06T10:15:30.900Z");
		expect(isSameTime(d1, d2)).toBe(true);
	});
});

describe("getStartOfDay", () => {
	it("sets time to 00:00:00.000", () => {
		const d = new Date(2026, 0, 15, 14, 30, 45, 500);
		const result = getStartOfDay(d);
		expect(result.getHours()).toBe(0);
		expect(result.getMinutes()).toBe(0);
		expect(result.getSeconds()).toBe(0);
		expect(result.getMilliseconds()).toBe(0);
	});

	it("does not mutate the original date", () => {
		const d = new Date(2026, 0, 15, 14, 30, 45, 500);
		getStartOfDay(d);
		expect(d.getHours()).toBe(14);
	});
});

describe("getEndOfDay", () => {
	it("sets time to 23:59:59.999", () => {
		const d = new Date(2026, 0, 15, 0, 0, 0, 0);
		const result = getEndOfDay(d);
		expect(result.getHours()).toBe(23);
		expect(result.getMinutes()).toBe(59);
		expect(result.getSeconds()).toBe(59);
		expect(result.getMilliseconds()).toBe(999);
	});
});

describe("getStartOfMonth", () => {
	it("sets day to 1", () => {
		const d = new Date(2026, 5, 15);
		const result = getStartOfMonth(d);
		expect(result.getDate()).toBe(1);
		expect(result.getMonth()).toBe(5);
	});
});

describe("getEndOfMonth", () => {
	it("returns last day of the month", () => {
		const d = new Date(2026, 0, 15); // January
		const result = getEndOfMonth(d);
		expect(result.getDate()).toBe(31);
	});

	it("handles February in non-leap year", () => {
		const d = new Date(2025, 1, 15); // Feb 2025
		const result = getEndOfMonth(d);
		expect(result.getDate()).toBe(28);
	});

	it("handles February in leap year", () => {
		const d = new Date(2024, 1, 15); // Feb 2024
		const result = getEndOfMonth(d);
		expect(result.getDate()).toBe(29);
	});
});

describe("getStartOfWeek", () => {
	it("returns Sunday of the same week", () => {
		// Wednesday Jan 15 2026
		const d = new Date(2026, 0, 15);
		const result = getStartOfWeek(d);
		expect(result.getDay()).toBe(0); // Sunday
		expect(result.getDate()).toBe(11); // Jan 11
	});
});

describe("getEndOfWeek", () => {
	it("returns Saturday of the same week at end of day", () => {
		// Wednesday Jan 15 2026
		const d = new Date(2026, 0, 15);
		const result = getEndOfWeek(d);
		expect(result.getDay()).toBe(6); // Saturday
		expect(result.getDate()).toBe(17); // Jan 17
		expect(result.getHours()).toBe(23);
		expect(result.getMinutes()).toBe(59);
		expect(result.getSeconds()).toBe(59);
	});
});

describe("getStartOfYear", () => {
	it("returns Jan 1 of the same year at start of day", () => {
		const d = new Date(2026, 5, 15, 15, 30, 45, 123);
		const result = getStartOfYear(d);
		expect(result.getFullYear()).toBe(2026);
		expect(result.getMonth()).toBe(0);
		expect(result.getDate()).toBe(1);
		expect(result.getHours()).toBe(0);
		expect(result.getMinutes()).toBe(0);
		expect(result.getSeconds()).toBe(0);
		expect(result.getMilliseconds()).toBe(0);
	});
});

describe("getEndOfYear", () => {
	it("returns Dec 31 of the same year at end of day", () => {
		const d = new Date(2026, 0, 15, 15, 30, 45, 123);
		const result = getEndOfYear(d);
		expect(result.getFullYear()).toBe(2026);
		expect(result.getMonth()).toBe(11);
		expect(result.getDate()).toBe(31);
		expect(result.getHours()).toBe(23);
		expect(result.getMinutes()).toBe(59);
		expect(result.getSeconds()).toBe(59);
		expect(result.getMilliseconds()).toBe(999);
	});
});

describe("addDays", () => {
	it("adds days correctly", () => {
		const d = new Date(2026, 0, 15);
		const result = addDays(d, 10);
		expect(result.getDate()).toBe(25);
	});

	it("handles negative days (crossing month boundary)", () => {
		const d = new Date(2026, 0, 15);
		const result = addDays(d, -20);
		expect(result.getMonth()).toBe(11); // December 2025
		expect(result.getDate()).toBe(26);
	});
});

describe("subDays", () => {
	it("subtracts days correctly", () => {
		const d = new Date(2026, 0, 15);
		const result = subDays(d, 10);
		expect(result.getDate()).toBe(5);
	});
});

describe("addWeeks", () => {
	it("adds 7 days per week", () => {
		const d = new Date(2026, 0, 15);
		const result = addWeeks(d, 2);
		expect(result.getDate()).toBe(29);
	});
});

describe("addMonths", () => {
	it("adds months correctly", () => {
		const d = new Date(2026, 0, 15);
		const result = addMonths(d, 2);
		expect(result.getMonth()).toBe(2);
		expect(result.getDate()).toBe(15);
	});

	it("handles year overflow", () => {
		const d = new Date(2026, 10, 15);
		const result = addMonths(d, 3);
		expect(result.getFullYear()).toBe(2027);
		expect(result.getMonth()).toBe(1);
	});
});

describe("addYears", () => {
	it("adds years correctly", () => {
		const d = new Date(2026, 0, 15);
		const result = addYears(d, 5);
		expect(result.getFullYear()).toBe(2031);
	});
});

describe("addHours", () => {
	it("adds hours correctly", () => {
		const d = new Date(2026, 0, 15, 10, 0, 0);
		const result = addHours(d, 3);
		expect(result.getHours()).toBe(13);
	});

	it("handles negative hours", () => {
		const d = new Date(2026, 0, 15, 10, 0, 0);
		const result = addHours(d, -12);
		expect(result.getHours()).toBe(22);
		expect(result.getDate()).toBe(14);
	});
});

describe("getDateBeforeMonths", () => {
	it("subtracts months from given date", () => {
		const d = new Date(2026, 5, 15);
		const result = getDateBeforeMonths(3, d);
		expect(result.getMonth()).toBe(2);
		expect(result.getDate()).toBe(15);
	});
});

describe("getYearsUntilNow", () => {
	it("generates years from start to current year", () => {
		const currentYear = new Date().getFullYear();
		const result = getYearsUntilNow(2020);
		expect(result[0]).toBe(2020);
		expect(result[result.length - 1]).toBe(currentYear);
		expect(result.length).toBe(currentYear - 2020 + 1);
	});
});

describe("listYears", () => {
	it("generates years in range", () => {
		const result = listYears(2020, 2023);
		expect(result).toEqual([2020, 2021, 2022, 2023]);
	});

	it("returns single element when start equals end", () => {
		expect(listYears(2025, 2025)).toEqual([2025]);
	});
});

describe("getFormattedDateString", () => {
	it("formats date as YYYY-MM-DD", () => {
		const d = new Date(2026, 0, 5); // Jan 5
		expect(getFormattedDateString(d)).toBe("2026-01-05");
	});

	it("pads month and day", () => {
		const d = new Date(2026, 10, 25); // Nov 25
		expect(getFormattedDateString(d)).toBe("2026-11-25");
	});
});

describe("mergeDateAndTime", () => {
	const date = new Date(2026, 0, 30);

	it("merges HH format", () => {
		const result = mergeDateAndTime(date, "17");
		expect(result.getHours()).toBe(17);
		expect(result.getMinutes()).toBe(0);
		expect(result.getSeconds()).toBe(0);
	});

	it("merges HH:mm format", () => {
		const result = mergeDateAndTime(date, "17:36");
		expect(result.getHours()).toBe(17);
		expect(result.getMinutes()).toBe(36);
	});

	it("merges HH:mm:ss format", () => {
		const result = mergeDateAndTime(date, "17:36:45");
		expect(result.getHours()).toBe(17);
		expect(result.getMinutes()).toBe(36);
		expect(result.getSeconds()).toBe(45);
	});

	it("throws on invalid format", () => {
		expect(() => mergeDateAndTime(date, "25:00")).toThrow();
		expect(() => mergeDateAndTime(date, "invalid")).toThrow();
	});

	it("throws on out-of-range hours", () => {
		expect(() => mergeDateAndTime(date, "24")).toThrow();
	});
});

describe("formatDuration", () => {
	it("formats zero", () => {
		expect(formatDuration(0)).toBe("00:00:00");
	});

	it("formats seconds only", () => {
		expect(formatDuration(5000)).toBe("00:00:05");
	});

	it("formats minutes and seconds", () => {
		expect(formatDuration(125000)).toBe("00:02:05");
	});

	it("formats hours, minutes, seconds", () => {
		expect(formatDuration(3723000)).toBe("01:02:03");
	});

	it("returns 00:00:00 for negative input", () => {
		expect(formatDuration(-1000)).toBe("00:00:00");
	});
});

describe("getDurationMs", () => {
	it("returns positive diff when end > start", () => {
		const start = new Date(2026, 0, 1, 10, 0, 0);
		const end = new Date(2026, 0, 1, 12, 0, 0);
		expect(getDurationMs(start, end)).toBe(2 * 3600 * 1000);
	});

	it("returns negative diff when end < start", () => {
		const start = new Date(2026, 0, 1, 12, 0, 0);
		const end = new Date(2026, 0, 1, 10, 0, 0);
		expect(getDurationMs(start, end)).toBe(-2 * 3600 * 1000);
	});
});

describe("getDurationBetweenDates", () => {
	it("formats duration between two dates", () => {
		const from = new Date(2026, 0, 1, 10, 0, 0);
		const to = new Date(2026, 0, 1, 12, 30, 45);
		expect(getDurationBetweenDates(from, to)).toBe("02:30:45");
	});

	it("uses absolute difference", () => {
		const from = new Date(2026, 0, 1, 12, 0, 0);
		const to = new Date(2026, 0, 1, 10, 0, 0);
		expect(getDurationBetweenDates(from, to)).toBe("02:00:00");
	});
});

describe("pad", () => {
	it("pads single digit", () => {
		expect(pad(5)).toBe("05");
	});

	it("does not pad double digit", () => {
		expect(pad(12)).toBe("12");
	});

	it("pads zero", () => {
		expect(pad(0)).toBe("00");
	});
});

describe("roundUpToNearestByMinutes", () => {
	it("rounds up to nearest 30 min", () => {
		const d = new Date(2024, 0, 1, 15, 35);
		const result = roundUpToNearestByMinutes(d, 30);
		expect(result.getHours()).toBe(16);
		expect(result.getMinutes()).toBe(0);
	});

	it("rounds up 16:17 to 16:30", () => {
		const d = new Date(2024, 0, 1, 16, 17);
		const result = roundUpToNearestByMinutes(d, 30);
		expect(result.getMinutes()).toBe(30);
	});

	it("returns exact time when already aligned", () => {
		const d = new Date(2024, 0, 1, 16, 0);
		const result = roundUpToNearestByMinutes(d, 30);
		expect(result.getHours()).toBe(16);
		expect(result.getMinutes()).toBe(0);
	});
});

describe("roundToNearestByMinutes", () => {
	it("rounds down to nearest 15 min", () => {
		const d = new Date(2024, 0, 1, 15, 7);
		const result = roundToNearestByMinutes(d, 15);
		expect(result.getMinutes()).toBe(0);
	});

	it("rounds up to nearest 15 min", () => {
		const d = new Date(2024, 0, 1, 15, 8);
		const result = roundToNearestByMinutes(d, 15);
		expect(result.getMinutes()).toBe(15);
	});
});

describe("formatYear", () => {
	it("returns 4-digit year string", () => {
		expect(formatYear(new Date(2026, 0, 1))).toBe("2026");
	});
});

describe("formatMonthYear", () => {
	it("returns month and year string", () => {
		const result = formatMonthYear(new Date(2026, 0, 1));
		expect(result).toContain("2026");
		expect(result).toContain("January");
	});
});
