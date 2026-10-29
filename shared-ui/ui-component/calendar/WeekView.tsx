import { useRef, useEffect, useState, useMemo } from "react";
import {
	COLORS,
	HOUR_HEIGHT,
	MIN_EVENT_HEIGHT,
	MIN_HEIGHT_FOR_TIME,
	type CalendarEvent,
} from "./type";
import {
	HOURS,
	isSameDay,
	isAllDay,
	computeColumns,
	getDayEvents,
	getEventPosition,
	getIsDayDisabled,
} from "./utils";
import { addDays, formatTime, getStartOfWeek, shortWeekNames } from "../../utils/date";
import classNames from "classnames";
import { Time } from "../../constants/time";
import { WeekViewAllDayEvent } from "./WeekViewAlldayEvent";

interface WeekViewProps {
	date: Date;
	events: CalendarEvent[];
	showWeekend: boolean;
	selectedSlot: Date | null;
	slotDurationMinutes: number;
	onSlotClick: (date: Date) => void;
	onEventClick: (event: CalendarEvent) => void;
	onDayClick: (date: Date) => void;
	language?: string;
	minDate?: Date;
	maxDate?: Date;
}

export const WeekView = (props: WeekViewProps) => {
	const {
		date,
		events,
		showWeekend,
		selectedSlot,
		slotDurationMinutes,
		onSlotClick,
		onEventClick,
		onDayClick,
		language = "en",
		minDate,
		maxDate,
	} = props;

	const scrollRef = useRef<HTMLDivElement>(null);
	const [currentMinute, setCurrentMinute] = useState<number>(0);

	const visibleDays = useMemo(() => {
		const weekStart = getStartOfWeek(date);
		const allDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
		return showWeekend ? allDays : allDays.slice(1, 6);
	}, [date, showWeekend]);

	useEffect(() => {
		const update = () => {
			const now = new Date();
			setCurrentMinute(now.getHours() * Time.MINUTES_IN_HOUR + now.getMinutes());
		};
		update();
		const id = setInterval(update, Time.MILLISECONDS_IN_MINUTE);
		return () => clearInterval(id);
	}, []);

	const isCurrentWeek = useMemo(() => {
		const today = new Date();
		return visibleDays.some((d) => isSameDay(d, today));
	}, [visibleDays]);

	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;

		requestAnimationFrame(() => {
			if (isCurrentWeek) {
				el.scrollTop = Math.max((new Date().getHours() - 1) * HOUR_HEIGHT, 0);
			} else {
				el.scrollTop = 8 * HOUR_HEIGHT - 20;
			}
		});
	}, [date, isCurrentWeek]);

	const layoutData = useMemo(() => {
		const now = new Date();
		const hasAllDay = visibleDays.some((d) => getDayEvents(d, events).some(isAllDay));

		const daysData = visibleDays.map((day) => {
			const timedEvs = getDayEvents(day, events).filter((e) => !isAllDay(e));
			const colMap = computeColumns(timedEvs);

			const layoutEvents = timedEvs.map((ev) => {
				const { top, height } = getEventPosition(ev, day);
				const colInfo = colMap.get(ev.id) ?? { col: 0, totalCols: 1 };
				return { ev, top, height, colInfo };
			});

			return {
				day,
				isToday: isSameDay(day, now),
				layoutEvents,
				isDisabled: getIsDayDisabled(day, minDate, maxDate),
			};
		});

		return { hasAllDay, daysData };
	}, [visibleDays, events, minDate, maxDate]);

	const selectedSlotLayout = useMemo(() => {
		if (!selectedSlot) return null;

		const startMinute = selectedSlot.getHours() * Time.MINUTES_IN_HOUR + selectedSlot.getMinutes();
		const top = (startMinute / Time.MINUTES_IN_HOUR) * HOUR_HEIGHT;
		const height = (slotDurationMinutes / Time.MINUTES_IN_HOUR) * HOUR_HEIGHT;
		const end = new Date(
			selectedSlot.getTime() + slotDurationMinutes * Time.MILLISECONDS_IN_MINUTE,
		);
		const label = `${formatTime(selectedSlot)} - ${formatTime(end)}`;

		return { top, height, label, dayKey: selectedSlot.toDateString() };
	}, [selectedSlot, slotDurationMinutes]);

	return (
		<div className="flex flex-col flex-1 min-h-0 bg-white">
			{/* Header row */}
			<div className="flex border-b border-neutral-200 shrink-0 bg-white z-30">
				<div className="w-12 shrink-0" />
				{layoutData.daysData.map(({ day, isToday, isDisabled }) => (
					<div
						key={day.toISOString()}
						className="flex-1 text-center py-2 border-l border-neutral-200 first:border-l-0"
					>
						<button
							type="button"
							disabled={isDisabled}
							className={classNames(
								"text-xs uppercase tracking-wider block w-full",
								isDisabled
									? "text-neutral-400 cursor-not-allowed"
									: "text-neutral-400 hover:text-primary-600 cursor-pointer transition-all",
							)}
							onClick={() => !isDisabled && onDayClick(day)}
						>
							{shortWeekNames(language)[day.getDay()]}
						</button>
						<div
							className={classNames(
								"text-sm font-medium mx-auto w-7 h-7 flex items-center justify-center rounded-full mt-0.5 transition-all",
								isDisabled
									? "text-neutral-400 cursor-not-allowed opacity-50"
									: isToday
										? "bg-primary-600 text-white cursor-pointer"
										: "text-neutral-700 hover:bg-primary-400/90 hover:text-white cursor-pointer",
							)}
							aria-disabled={isDisabled || undefined}
							onClick={() => !isDisabled && onDayClick(day)}
						>
							{day.getDate()}
						</div>
					</div>
				))}
			</div>

			{/* Scrollable timed grid */}
			<div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto scroll-smooth relative">
				{layoutData.hasAllDay && (
					<WeekViewAllDayEvent
						events={events}
						hasAllDay={layoutData.hasAllDay}
						onEventClick={onEventClick}
						visibleDays={visibleDays}
					/>
				)}

				{/* Timed grid container */}
				<div className="relative flex" style={{ height: HOUR_HEIGHT * 24 }}>
					{/* Background Grid Lines */}
					<div className="absolute inset-0 left-12 pointer-events-none flex flex-col">
						{HOURS.map((hour) => (
							<div key={hour} className="relative w-full" style={{ height: HOUR_HEIGHT }}>
								<div className="absolute top-0 w-full border-t border-neutral-200" />
								<div className="absolute top-1/2 w-full border-t border-neutral-100" />
							</div>
						))}
					</div>

					{/* Time labels */}
					<div className="w-12 shrink-0 relative bg-white z-10">
						{HOURS.map((hour) => (
							<div
								key={hour}
								className="absolute right-0 left-0 text-right pr-2"
								style={{ top: hour * HOUR_HEIGHT - 8 }}
							>
								{hour !== 0 && (
									<span className="text-xs text-neutral-400 select-none">
										{formatTime(new Date(0, 0, 0, hour))}
									</span>
								)}
							</div>
						))}
					</div>

					{/* Interactive Day columns */}
					{layoutData.daysData.map(({ day, isToday, layoutEvents, isDisabled }) => {
						const isSelectedDay = selectedSlotLayout?.dayKey === day.toDateString();

						return (
							<div
								key={day.toISOString()}
								className={classNames(
									"flex-1 relative border-l border-neutral-200 first:border-l-0",
									isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
									isToday && !isDisabled && "bg-info-50/20",
								)}
								onClick={(e) => {
									if (isDisabled) return;
									const rect = e.currentTarget.getBoundingClientRect();
									const minutes = Math.floor(
										((e.clientY - rect.top) / HOUR_HEIGHT) * Time.MINUTES_IN_HOUR,
									);
									const clicked = new Date(day);
									clicked.setHours(
										Math.floor(minutes / Time.MINUTES_IN_HOUR),
										minutes % Time.MINUTES_IN_HOUR,
										0,
										0,
									);
									onSlotClick(clicked);
								}}
							>
								{/* Current time line */}
								{isToday && (
									<div
										className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
										style={{ top: (currentMinute / Time.MINUTES_IN_HOUR) * HOUR_HEIGHT }}
									>
										<div className="w-2 h-2 rounded-full bg-danger-500 -ml-1" />
										<div className="flex-1 h-0.5 bg-danger-500" />
									</div>
								)}

								{/* Selected slot highlight */}
								{isSelectedDay && selectedSlotLayout && (
									<div
										className="absolute inset-x-0 rounded border-l-2 border-primary-500 bg-primary-100/70 flex items-start px-2 py-0.5 z-20 pointer-events-none"
										style={{ top: selectedSlotLayout.top, height: selectedSlotLayout.height }}
									>
										<span className="text-xs font-medium text-primary-700 leading-tight select-none">
											{selectedSlotLayout.label}
										</span>
									</div>
								)}

								{/* Events */}
								{layoutEvents.map(({ ev, top, height, colInfo }) => {
									const widthPct = 100 / colInfo.totalCols;
									const leftPct = colInfo.col * widthPct;

									return (
										<button
											key={ev.id}
											onClick={(e) => {
												e.stopPropagation();
												onEventClick(ev);
											}}
											className="cursor-pointer absolute rounded overflow-hidden text-left hover:brightness-95 transition-all shadow-sm"
											style={{
												top,
												height: Math.max(height, MIN_EVENT_HEIGHT),
												left: `${leftPct}%`,
												width: `calc(${widthPct}% - 2px)`,
												backgroundColor: ev.color ?? COLORS.blue,
												zIndex: 10,
											}}
										>
											<div className="px-1.5 py-0.5">
												<div className="text-xs font-semibold text-white leading-tight truncate">
													{ev.title}
												</div>
												{height > MIN_HEIGHT_FOR_TIME && (
													<div className="text-[10px] text-white/90 leading-tight truncate">
														{formatTime(new Date(ev.start))} - {formatTime(new Date(ev.end))}
													</div>
												)}
											</div>
										</button>
									);
								})}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
};
