import classNames from 'classnames';
import { getStartOfDay, isSameTime } from '../../utils/date';
import type { DateRangeType } from './types';

interface GeneratedDaysProps {
  currentMonth: Date;
  maxDate?: Date | null;
  minDate?: Date | null;
  dateRange: DateRangeType;
  handleDateClick: (value: Date) => void;
  size?: 'sm' | 'md';
  dateClassName?: (date: Date) => string;
  hoveredDate?: Date | null;
  setHoveredDate?: (date: Date | null) => void;
}

export default function GeneratedDays(props: GeneratedDaysProps) {
  const {
    currentMonth,
    minDate,
    maxDate,
    dateRange,
    handleDateClick,
    size = 'md',
    dateClassName,
    setHoveredDate,
    hoveredDate,
  } = props;

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} />);
  }

  // Add days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i);
    const isDisabled = (minDate && date < minDate) || (maxDate && date > maxDate);
    const previewEnd = dateRange.startDate && !dateRange.endDate ? hoveredDate : dateRange.endDate;
    const isInRange = dateRange.startDate && previewEnd && date > dateRange.startDate && date < previewEnd;
    const isStartDate = dateRange.startDate && isSameTime(date, dateRange.startDate, 'day');
    const isEndDate = dateRange.endDate && isSameTime(date, getStartOfDay(dateRange.endDate), 'day');

    days.push(
      <div
        key={i}
        onClick={() => !isDisabled && handleDateClick(date)}
        onMouseEnter={() => {
          if (!dateRange.endDate && dateRange.startDate) {
            setHoveredDate?.(date);
          }
        }}
        onMouseLeave={() => {
          if (!dateRange.endDate) {
            setHoveredDate?.(null);
          }
        }}
      >
        <span
          className={classNames(
            'flex items-center text-center justify-center rounded-full p-1.5 transition-all duration-200 ease-in-out',
            dateClassName?.(date),
            {
              'bg-primary-100 scale-105': isInRange,
              'bg-primary-500 text-white hover:text-white hover:bg-primary-400 scale-105': isStartDate || isEndDate,
            },
            isDisabled
              ? 'cursor-not-allowed text-neutral-600 bg-neutral-200'
              : 'cursor-pointer hover:bg-primary-100/70 text-neutral-800',
            size === 'sm' && 'text-xs',
            size === 'md' && 'sm:text-sm text-xs'
          )}
        >
          {i}
        </span>
      </div>
    );
  }

  return days;
}
