import classNames from 'classnames';
import { useRef } from 'react';
import type { SegmentedControlProps, SegmentedControlSize } from './types';
import { createRipple } from '../../utils/ripple';

const segmentedControlSize = (size: SegmentedControlSize): string => {
  switch (size) {
    case 'sm':
      return 'px-2 py-1 text-xs';
    case 'md':
      return 'px-3.5 py-1.75 text-sm';
    case 'lg':
      return 'px-4.25 py-2.5 text-normal';
    default:
      return '';
  }
};

export const SegmentedControl = <T extends string | number>(props: SegmentedControlProps<T>) => {
  const { name, value, onChange, options, label, className, direction, disabled, size = 'md' } = props;

  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>, optionValue: T) => {
    if (disabled) return;

    const button = buttonRefs.current[optionValue as string];
    if (button) {
      createRipple(button, { clientX: event.clientX, clientY: event.clientY });
    }

    onChange(optionValue);
  };

  return (
    <div
      className={classNames(
        'relative flex',
        direction === 'row' ? 'inline-flex gap-4 items-center justify-start' : 'flex-col',
        className
      )}
    >
      {label && (
        <label
          htmlFor={name}
          className={classNames(
            'block',
            disabled ? 'text-neutral-400' : 'text-neutral-700',
            direction === 'row' ? 'flex items-center flex-shrink-0 text-sm h-9.5' : 'text-xs mb-1'
          )}
        >
          {label}
        </label>
      )}

      <div
        id={name}
        className={classNames('flex items-center gap-0.5 rounded-lg p-0.5', disabled ? 'bg-neutral-50' : 'bg-neutral-100')}
      >
        {options.map(option => {
          const isOptionDisabled = disabled || option.disabled;
          const isSelected = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              disabled={isOptionDisabled}
              ref={el => {
                buttonRefs.current[option.value as string] = el;
              }}
              onClick={event => handleClick(event, option.value)}
              className={classNames(
                'flex-1 inline-flex items-center justify-center gap-1.5 font-medium rounded-md transition-all overflow-hidden relative',
                segmentedControlSize(size),
                isOptionDisabled ? 'cursor-not-allowed' : 'cursor-pointer',
                isSelected
                  ? isOptionDisabled
                    ? 'bg-white text-neutral-300 shadow-sm'
                    : 'bg-white text-primary-700 shadow-sm'
                  : isOptionDisabled
                    ? 'text-neutral-300'
                    : 'text-neutral-500 hover:text-primary-600'
              )}
            >
              {option.icon}
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
