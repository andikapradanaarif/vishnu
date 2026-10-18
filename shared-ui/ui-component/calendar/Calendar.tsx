import {useMemo, useState} from "react";
import {getViews, type CalendarEvent, type CalendarProps} from "./type";
import {DayView} from "./DayView";
import {WeekView} from "./WeekView";
import {MonthView} from "./MonthView";
import {YearView} from "./YearView";
import {getAdjacentDate, getPeriodBounds, getTitle, isSameDay} from "./utils";
import {Button} from "../button/Button";
import {Checkbox} from "../input/Checkbox";
import {SegmentedControl} from "../input/SegmentedControl";
import {addDays, getEndOfDay, getEndOfWeek, getStartOfDay, getStartOfWeek} from "../../utils/date";
import {CalendarSkeleton} from "./CalendarSkeleton";
import classNames from "classnames";
import type {CalendarView} from "./type";
import {translate} from "../../utils/translation";

const DEFAULT_SLOT_DURATION_MINUTES = 30;

const disabledStyling =
	"disabled:!bg-neutral-300 disabled:!text-white disabled:cursor-not-allowed disabled:hover:!opacity-100 disabled:!border-transparent";

export const Calendar = (props: CalendarProps) => {
	const {
		events = [],
		view: viewProps = "week",
		onChangeView,
		date,
		onChangeDate,
		onEventClick,
		onSlotClick,
		selectedSlot: selectedSlotProp,
		onChangeSelectedSlot,
		isLoading = false,
		loadingText,
		slotDurationMinutes = DEFAULT_SLOT_DURATION_MINUTES,
		onRefresh,
		minDate,
		maxDate,
		translations,
		language = "en",
	} = props;

	const [viewState, setViewState] = useState<CalendarView>(viewProps);
	const [showWeekend, setShowWeekend] = useState(true);

	const views = useMemo(() => getViews(language, translations), [language, translations]);

	const isControlledView = viewProps && !!onChangeView;
	const isControlledSlot = !!onChangeSelectedSlot;

	const [selectedSlotState, setSelectedSlotState] = useState<{
		slotDate: Date;
		viewDate: Date;
		view: CalendarView;
	} | null>(null);

	const view = useMemo(() => {
		if (isControlledView) return viewProps;
		return viewState;
	}, [isControlledView, viewProps, viewState]);

	// The active slot to pass down to child views.
	// - Controlled mode: consumer owns the value entirely; we pass it through as-is.
	// - Uncontrolled mode: gate against the current view/date so the highlight
	//   disappears automatically when navigating away
	const activeSelectedSlot = useMemo(() => {
		if (isControlledSlot) return selectedSlotProp ?? null;

		const slot = selectedSlotState?.slotDate ?? null;
		if (!slot || selectedSlotState?.view !== view) return null;

		if (view === "day") {
			return isSameDay(selectedSlotState.viewDate, date) ? slot : null;
		}

		if (view === "week") {
			const weekStart = getStartOfWeek(date);
			const weekEnd = getEndOfWeek(date);
			return slot >= weekStart && slot <= weekEnd ? slot : null;
		}

		return null;
	}, [isControlledSlot, selectedSlotProp, selectedSlotState, view, date]);

	const handleChangeView = (changedView: CalendarView) => {
		if (isControlledView) {
			onChangeView(changedView);
		} else {
			setViewState(changedView);
		}
	};

	const periodBounds = getPeriodBounds(date, view);

	// With weekends hidden, WeekView renders only Mon–Fri — a bound landing on a
	// hidden weekend day must not enable navigation into a fully-disabled week.
	const lastRenderedDayPrev =
		view === "week" && !showWeekend ? addDays(periodBounds.start, -2) : addDays(periodBounds.start, -1);
	const firstRenderedDayNext =
		view === "week" && !showWeekend ? addDays(periodBounds.start, 8) : addDays(periodBounds.end, 1);

	const canNavigatePrev = (() => {
		if (!minDate) return true;
		return getStartOfDay(lastRenderedDayPrev) >= getStartOfDay(minDate);
	})();

	const canNavigateNext = (() => {
		if (!maxDate) return true;
		return getStartOfDay(firstRenderedDayNext) <= getStartOfDay(maxDate);
	})();

	const handleNavigation = (direction: -1 | 1) => {
		const newDate = getAdjacentDate(date, view, direction);

		const clampedDate = (() => {
			if (direction === 1 && maxDate && newDate > maxDate) return maxDate;
			if (direction === -1 && minDate && newDate < minDate) return minDate;
			return newDate;
		})();

		onChangeDate(clampedDate);
	};

	const goToToday = () => {
		const today = new Date();
		if (minDate && today < getStartOfDay(minDate)) return onChangeDate(minDate);
		if (maxDate && today > getEndOfDay(maxDate)) return onChangeDate(maxDate);
		onChangeDate(today);
	};

	const handleEventClick = (event: CalendarEvent) => {
		onEventClick?.(event);
	};

	const handleSlotClick = (slotDate: Date) => {
		if (isControlledSlot) {
			onChangeSelectedSlot(slotDate);
		} else {
			setSelectedSlotState({slotDate, viewDate: date, view});
		}
		onSlotClick?.(slotDate);
	};

	return (
		<div className="flex flex-col h-full bg-white font-sans">
			{/* Toolbar */}
			<div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-200 shrink-0 flex-wrap">
				<Button
					variant="outlined"
					className="text-neutral-600 border border-neutral-200 hover:bg-neutral-50 transition-colors"
					icon="↻"
					onClick={onRefresh}
					isLoading={isLoading}
				>
					{translate(language, "calendar.refresh", "Refresh")}
				</Button>
				{/* Today button */}
				<Button
					onClick={goToToday}
					className="text-neutral-600 border border-neutral-200 hover:bg-neutral-50 transition-colors"
					variant="outlined"
					isLoading={isLoading}
				>
					{translate(language, "calendar.today", "Today")}
				</Button>

				{/* Navigation */}
				<div className="flex items-center gap-1">
					<button
						onClick={() => {
							if (!isLoading) handleNavigation(-1);
						}}
						className={classNames(
							"w-7 h-7 flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 transition-colors",
							isLoading ? "cursor-not-allowed" : "cursor-pointer",
							disabledStyling,
						)}
						disabled={!canNavigatePrev}
					>
						<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
							<path
								d="M9 11L5 7l4-4"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</button>
					<button
						onClick={() => {
							if (!isLoading) handleNavigation(1);
						}}
						className={classNames(
							"w-7 h-7 flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 transition-colors",
							isLoading ? "cursor-not-allowed" : "cursor-pointer",
							disabledStyling,
						)}
						disabled={!canNavigateNext}
					>
						<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
							<path
								d="M5 3l4 4-4 4"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</button>
				</div>

				{/* Title */}
				<h2 className="text-sm font-semibold text-neutral-900 flex-1">{getTitle(view, date)}</h2>

				<div className="flex gap-4">
					{view === "week" && !isLoading && (
						<label className="flex items-center gap-1.5 cursor-pointer">
							<Checkbox
								checked={showWeekend}
								onChecked={setShowWeekend}
								id="show-weekend"
								label={translate(language, "calendar.showWeekends", "Show weekends")}
							/>
						</label>
					)}
					<div>
						<SegmentedControl
							name="calendar-view-options"
							onChange={(value) => handleChangeView(value)}
							options={views}
							value={view}
							disabled={isLoading}
						/>
					</div>
				</div>
			</div>

			{/* View content */}
			<div className="flex-1 min-h-0 flex flex-col overflow-hidden">
				{isLoading ? (
					<CalendarSkeleton view={view} showWeekend={showWeekend} loadingText={loadingText} />
				) : (
					<>
						{view === "day" && (
							<DayView
								date={date}
								events={events}
								selectedSlot={activeSelectedSlot}
								slotDurationMinutes={slotDurationMinutes}
								onSlotClick={handleSlotClick}
								onEventClick={handleEventClick}
								minDate={minDate}
								maxDate={maxDate}
							/>
						)}
						{view === "week" && (
							<WeekView
								date={date}
								events={events}
								showWeekend={showWeekend}
								selectedSlot={activeSelectedSlot}
								slotDurationMinutes={slotDurationMinutes}
								onSlotClick={handleSlotClick}
								onEventClick={handleEventClick}
								onDayClick={(d) => {
									onChangeDate(d);
									handleChangeView("day");
								}}
								language={language}
								minDate={minDate}
								maxDate={maxDate}
							/>
						)}
						{view === "month" && (
							<MonthView
								date={date}
								events={events}
								onDayClick={(d) => {
									onChangeDate(d);
									handleChangeView("day");
								}}
								onEventClick={handleEventClick}
								language={language}
								minDate={minDate}
								maxDate={maxDate}
							/>
						)}
						{view === "year" && (
							<YearView
								date={date}
								events={events}
								onMonthClick={(d) => {
									onChangeDate(d);
									handleChangeView("month");
								}}
								onDayClick={(d) => {
									onChangeDate(d);
									handleChangeView("day");
								}}
								language={language}
								minDate={minDate}
								maxDate={maxDate}
							/>
						)}
					</>
				)}
			</div>
		</div>
	);
};
