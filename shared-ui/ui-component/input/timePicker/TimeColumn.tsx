import classNames from 'classnames';
import { memo, useEffect, useRef } from 'react';

interface TimeColumnProps {
  items: string[];
  selected: string | null;
  onSelect: (v: string) => void;
  label: string;
  maxTime?: string;
  maxTimeReached?: boolean;
}

export const TimeColumn = memo(function TimeColumn(props: TimeColumnProps) {
  const { items, selected, onSelect, label, maxTime, maxTimeReached } = props;
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll to selected item on mount
  useEffect(() => {
    if (!listRef.current || !selected) return;
    const el = listRef.current.querySelector('[data-selected="true"]') as HTMLElement | null;
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [selected]);

  return (
    <div className="flex flex-col flex-1 min-w-0">
      <div className="text-xs text-neutral-400 font-medium text-center py-1 border-b border-neutral-100 sticky top-0 bg-white z-10">
        {label}
      </div>
      <div ref={listRef} className="overflow-y-auto max-h-44 flex flex-col gap-0.5 p-1">
        {items.map(item => {
          const isSelected = item === selected;
          const isDisabled = Boolean(maxTime && item > maxTime && maxTimeReached);
          return (
            <button
              key={item}
              type="button"
              data-selected={isSelected}
              disabled={isDisabled}
              onClick={() => !isDisabled && onSelect(item)}
              className={classNames(
                'w-full px-2 py-1.5 rounded-md text-sm text-center transition-colors',
                isDisabled
                  ? 'opacity-40 cursor-not-allowed'
                  : isSelected
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'text-neutral-800 hover:bg-primary-50'
              )}
            >
              {item}
            </button>
          );
        })}
      </div>
    </div>
  );
});
