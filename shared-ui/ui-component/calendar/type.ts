import type {SegmentedControlOption} from "../input/types";
import type {Language} from "../../types/translations";
import {translate} from "../../utils/translation";

export type CalendarView = "day" | "week" | "month" | "year";

export interface CalendarEvent {
	id: string;
	title: string;
	start: Date;
	end: Date;
	allDay?: boolean;
	color?: string;
}

export interface CalendarProps {
	events?: CalendarEvent[];
	view?: CalendarView;
	onChangeView?: (view: CalendarView) => void;
	date: Date;
	onChangeDate: (value: Date) => void;
	onEventClick?: (event: CalendarEvent) => void;
	onSlotClick?: (date: Date) => void;
	isLoading?: boolean;
	loadingText?: string;
	selectedSlot?: Date;
	onChangeSelectedSlot?: (date: Date) => void;
	slotDurationMinutes?: number;
	onRefresh: () => void;
	minDate?: Date;
	maxDate?: Date;
	translations?: Record<string, string>;
	language?: Language;
}

export const HOUR_HEIGHT = 64; // px per hour
export const MIN_EVENT_HEIGHT = 24;
export const MIN_HEIGHT_FOR_TIME = 36;

export const getViews = (
	language: Language = "en",
	translations?: Record<string, string>,
): SegmentedControlOption<CalendarView>[] => [
	{value: "day", label: translate(language, "calendar.view.day", translations?.["calendar.view.day"] ?? "Day")},
	{value: "week", label: translate(language, "calendar.view.week", translations?.["calendar.view.week"] ?? "Week")},
	{value: "month", label: translate(language, "calendar.view.month", translations?.["calendar.view.month"] ?? "Month")},
	{value: "year", label: translate(language, "calendar.view.year", translations?.["calendar.view.year"] ?? "Year")},
];

export const COLORS = {
	blue: "#2563eb",
	violet: "#7c3aed",
	emerald: "#059669",
	amber: "#d97706",
	pink: "#db2777",
	red: "#dc2626",
	cyan: "#0891b2",
	lime: "#65a30d",
} as const;

export type CalendarEventColor = keyof typeof COLORS;

export const COLORS_ARRAY = Object.values(COLORS);
