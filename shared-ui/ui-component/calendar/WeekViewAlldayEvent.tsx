import { useMemo } from 'react';
import { COLORS, type CalendarEvent } from './type';
import { isAllDay } from './utils';
import { getEndOfDay, getStartOfDay } from '../../utils/date';
import classNames from 'classnames';

const ALL_DAY_ROW_HEIGHT = 22; // px per event row
const ALL_DAY_PADDING = 6; // total vertical padding inside the sticky row

interface WeekViewAllDayEventProps {
  hasAllDay: boolean;
  visibleDays: Date[];
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export const WeekViewAllDayEvent = (props: WeekViewAllDayEventProps) => {
  const { hasAllDay, visibleDays = [], events = [], onEventClick } = props;

  // Calculate all layout metrics ONCE in useMemo
  const layoutEvents = useMemo(() => {
    if (!visibleDays.length) return [];

    const visibleStart = getStartOfDay(visibleDays[0]).getTime();
    const visibleEnd = getEndOfDay(visibleDays[visibleDays.length - 1]).getTime();

    const processedEvents = events.filter(isAllDay).reduce(
      (acc, ev) => {
        const startTime = new Date(ev.start).getTime();
        const endTime = new Date(ev.end).getTime();

        if (startTime <= visibleEnd && endTime >= visibleStart) {
          acc.push({ ...ev, startTime, endTime });
        }
        return acc;
      },
      [] as (CalendarEvent & { startTime: number; endTime: number })[]
    );

    processedEvents.sort((a, b) => {
      if (a.startTime !== b.startTime) return a.startTime - b.startTime;
      return b.endTime - b.startTime - (a.endTime - a.startTime);
    });

    const layout = [];
    const rowEndDayIdx = new Map<number, number>();

    for (const ev of processedEvents) {
      const firstDayIdx = visibleDays.findIndex(
        vd => ev.startTime <= getEndOfDay(vd).getTime() && ev.endTime >= getStartOfDay(vd).getTime()
      );
      const lastDayIdx = visibleDays.findLastIndex(
        vd => ev.startTime <= getEndOfDay(vd).getTime() && ev.endTime >= getStartOfDay(vd).getTime()
      );

      if (firstDayIdx === -1 || lastDayIdx === -1) continue;

      let row = 0;
      while (rowEndDayIdx.has(row) && (rowEndDayIdx.get(row) as number) >= firstDayIdx) {
        row++;
      }
      rowEndDayIdx.set(row, lastDayIdx);

      layout.push({
        event: ev,
        row,
        firstDayIdx,
        span: lastDayIdx - firstDayIdx + 1,
        startsBeforeWeek: ev.startTime < visibleStart,
        endsAfterWeek: ev.endTime > visibleEnd,
      });
    }

    return layout;
  }, [visibleDays, events]);

  const maxAllDayRows = hasAllDay && layoutEvents.length > 0 ? Math.max(...layoutEvents.map(l => l.row)) + 1 : 0;
  const allDaySectionHeight = maxAllDayRows * ALL_DAY_ROW_HEIGHT + ALL_DAY_PADDING;

  return (
    <div className="sticky top-0 z-20 flex border-b border-neutral-200 bg-white" style={{ height: allDaySectionHeight }}>
      {/* Label */}
      <div className="w-12 shrink-0 text-xs text-neutral-400 px-1 pt-1 text-right">all-day</div>

      <div className="flex flex-1 relative">
        {/* Background Grid Lines (Empty columns) */}
        {visibleDays.map(day => (
          <div key={day.toISOString()} className="flex-1 border-l border-neutral-200 first:border-l-0" />
        ))}

        {/* Absolute Events Layer */}
        {layoutEvents.map(({ event, row, firstDayIdx, span, startsBeforeWeek, endsAfterWeek }) => {
          const leftPct = (firstDayIdx / visibleDays.length) * 100;
          const widthPct = (span / visibleDays.length) * 100;

          return (
            <button
              key={event.id}
              type="button"
              onClick={e => {
                e.stopPropagation();
                onEventClick(event);
              }}
              className={classNames(
                'cursor-pointer absolute flex items-center px-1.5 text-xs font-medium text-white truncate hover:opacity-90 transition-opacity',
                startsBeforeWeek ? 'rounded-l-none' : 'rounded-l',
                endsAfterWeek ? 'rounded-r-none' : 'rounded-r'
              )}
              style={{
                backgroundColor: event.color ?? COLORS.blue,
                top: row * ALL_DAY_ROW_HEIGHT + 3,
                height: ALL_DAY_ROW_HEIGHT - 2,
                left: `calc(${leftPct}% + 2px)`,
                width: `calc(${widthPct}% - 4px)`,
                zIndex: 1,
              }}
            >
              {event.title}
            </button>
          );
        })}
      </div>
    </div>
  );
};
