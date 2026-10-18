import {useRef, useEffect, useState, useMemo} from "react";
import {COLORS, HOUR_HEIGHT, MIN_EVENT_HEIGHT, MIN_HEIGHT_FOR_TIME, type CalendarEvent} from "./type";
import {HOURS, isSameDay, isAllDay, computeColumns, getEventPosition, getIsDayDisabled} from "./utils";
import {formatTime, getEndOfDay, getStartOfDay} from "../../utils/date";
import {Time} from "../../constants/time";
import classNames from "classnames";

interface DayViewProps {
	date: Date;
	events: CalendarEvent[];
	selectedSlot: Date | null;
	slotDurationMinutes: number;
	onSlotClick: (date: Date) => void;
	onEventClick: (event: CalendarEvent) => void;
	minDate?: Date;
	maxDate?: Date;
}

export const DayView = (props: DayViewProps) => {
	const {date, events, selectedSlot, slotDurationMinutes, onSlotClick, onEventClick, minDate, maxDate} = props;

	const isDisabled = useMemo(() => getIsDayDisabled(date, minDate, maxDate), [date, minDate, maxDate]);

	const scrollRef = useRef<HTMLDivElement>(null);
	const [currentMinute, setCurrentMinute] = useState<number>(0);

	const isToday = useMemo(() => isSameDay(date, new Date()), [date]);

	useEffect(() => {
		const update = () => {
			const now = new Date();
			setCurrentMinute(now.getHours() * Time.MINUTES_IN_HOUR + now.getMinutes());
		};
		update();
		const id = setInterval(update, Time.MILLISECONDS_IN_MINUTE);
		return () => clearInterval(id);
	}, []);

	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;

		requestAnimationFrame(() => {
			if (isToday) {
				// Scroll to slightly before current time
				el.scrollTop = Math.max((new Date().getHours() - 1) * HOUR_HEIGHT, 0);
			} else {
				// Standard behavior for non-today views: Scroll to 8 AM
				el.scrollTop = 8 * HOUR_HEIGHT - 20;
			}
		});
	}, [date, isToday]);

	const layoutData = useMemo(() => {
		const dayStart = getStartOfDay(date).getTime();
		const dayEnd = getEndOfDay(date).getTime();

		const dayEvents = events.filter((e) => {
			const eStart = new Date(e.start).getTime();
			const eEnd = new Date(e.end).getTime();
			return eStart <= dayEnd && eEnd >= dayStart;
		});

		const allDayEvents = dayEvents.filter(isAllDay);
		const timedEventsRaw = dayEvents.filter((e) => !isAllDay(e));
		const columns = computeColumns(timedEventsRaw);

		const timedEvents = timedEventsRaw.map((ev) => {
			const {top, height} = getEventPosition(ev, date);
			const colInfo = columns.get(ev.id) ?? {col: 0, totalCols: 1};
			return {ev, top, height, colInfo};
		});

		return {allDayEvents, timedEvents};
	}, [date, events]);

	const selectedSlotLayout = useMemo(() => {
		if (!selectedSlot || !isSameDay(selectedSlot, date)) return null;

		const startMinute = selectedSlot.getHours() * Time.MINUTES_IN_HOUR + selectedSlot.getMinutes();
		const top = (startMinute / Time.MINUTES_IN_HOUR) * HOUR_HEIGHT;
		const height = (slotDurationMinutes / Time.MINUTES_IN_HOUR) * HOUR_HEIGHT;
		const end = new Date(selectedSlot.getTime() + slotDurationMinutes * Time.MILLISECONDS_IN_MINUTE);
		const label = `${formatTime(selectedSlot)} - ${formatTime(end)}`;

		return {top, height, label};
	}, [selectedSlot, slotDurationMinutes, date]);

	const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
		if (isDisabled) return;
		const rect = e.currentTarget.getBoundingClientRect();
		const y = e.clientY - rect.top;

		const minutes = Math.floor((y / HOUR_HEIGHT) * Time.MINUTES_IN_HOUR);
		const clicked = new Date(date);
		clicked.setHours(Math.floor(minutes / Time.MINUTES_IN_HOUR), minutes % Time.MINUTES_IN_HOUR, 0, 0);
		onSlotClick(clicked);
	};

	return (
		<div className="flex flex-col h-full bg-white">
			{/* All-day row */}
			{layoutData.allDayEvents.length > 0 && (
				<div className="flex border-b border-neutral-200 bg-neutral-50/50">
					<div className="w-14 shrink-0 text-xs text-neutral-400 px-2 py-2 text-right">all-day</div>
					<div className="flex-1 p-1 flex flex-col gap-0.5 z-20">
						{layoutData.allDayEvents.map((ev) => (
							<button
								key={ev.id}
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onEventClick(ev);
								}}
								className="cursor-pointer text-left px-2 py-0.5 rounded text-xs font-medium text-white truncate hover:opacity-90 transition-opacity"
								style={{backgroundColor: ev.color ?? COLORS.blue}}
							>
								{ev.title}
							</button>
						))}
					</div>
				</div>
			)}

			{/* Timed grid */}
			<div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto scroll-smooth relative">
				<div
					className={classNames("relative", isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer")}
					style={{height: HOUR_HEIGHT * 24}}
					onClick={handleGridClick}
				>
					{/* Background Lines */}
					<div className="absolute inset-0 pointer-events-none">
						{HOURS.map((hour) => (
							<div key={hour} className="absolute left-0 right-0 flex" style={{top: hour * HOUR_HEIGHT}}>
								<div className="w-14 shrink-0 text-xs text-neutral-400 text-right pr-3 -mt-2.5 select-none bg-white z-10">
									{hour === 0 ? "" : formatTime(new Date(0, 0, 0, hour))}
								</div>
								<div className="flex-1 border-t border-neutral-200" />
							</div>
						))}
						{HOURS.map((hour) => (
							<div
								key={`half-${hour}`}
								className="absolute left-14 right-0 border-t border-neutral-100"
								style={{top: hour * HOUR_HEIGHT + HOUR_HEIGHT / 2}}
							/>
						))}
					</div>

					{/* Current time indicator */}
					{isToday && (
						<div
							className="absolute left-14 right-0 z-10 flex items-center pointer-events-none"
							style={{top: (currentMinute / Time.MINUTES_IN_HOUR) * HOUR_HEIGHT}}
						>
							<div className="w-2 h-2 rounded-full bg-danger-500 -ml-1" />
							<div className="flex-1 h-px bg-danger-500" />
						</div>
					)}

					{/* Events + Selected Slot container */}
					<div className="absolute left-14 right-2 top-0 bottom-0 pointer-events-none">
						{/* Selected slot highlight */}
						{selectedSlotLayout && (
							<div
								className="absolute left-0 right-0 rounded border-l-2 border-primary-500 bg-primary-100/70 flex items-start px-2 py-0.5 z-20"
								style={{top: selectedSlotLayout.top, height: selectedSlotLayout.height}}
							>
								<span className="text-xs font-medium text-primary-700 leading-tight select-none">
									{selectedSlotLayout.label}
								</span>
							</div>
						)}

						{/* Timed events */}
						{layoutData.timedEvents.map(({ev, top, height, colInfo}) => {
							const widthPct = 100 / colInfo.totalCols;
							const leftPct = colInfo.col * widthPct;

							return (
								<button
									key={ev.id}
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										onEventClick(ev);
									}}
									className="cursor-pointer absolute rounded overflow-hidden text-left transition-all hover:brightness-95 shadow-sm pointer-events-auto"
									style={{
										top,
										height: Math.max(height, MIN_EVENT_HEIGHT),
										left: `${leftPct}%`,
										width: `calc(${widthPct}% - 2px)`,
										backgroundColor: ev.color ?? COLORS.blue,
									}}
								>
									<div className="px-1.5 py-0.5">
										<div className="text-xs font-semibold text-white leading-tight truncate">{ev.title}</div>
										{height > MIN_HEIGHT_FOR_TIME && (
											<div className="text-[10px] text-white/90 leading-tight">
												{formatTime(new Date(ev.start))} - {formatTime(new Date(ev.end))}
											</div>
										)}
									</div>
								</button>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
};
