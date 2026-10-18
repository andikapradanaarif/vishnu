import { Icon } from '@iconify/react';
import classNames from 'classnames';
import { memo } from 'react';

interface TimeTriggerProps {
  name: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  error?: string | boolean;
  size?: 'sm' | 'md';
  'aria-haspopup'?: 'dialog';
  'aria-expanded'?: boolean;
  'aria-controls'?: string;
}

export const TimeTrigger = memo(function TimeTrigger(props: TimeTriggerProps) {
  const { name, disabled, error, size = 'md', value, placeholder } = props;

  return (
    <button
      type="button"
      id={`timepicker-${name}`}
      disabled={disabled}
      aria-haspopup={props['aria-haspopup']}
      aria-expanded={props['aria-expanded']}
      aria-controls={props['aria-controls']}
      className={classNames(
        'appearance-none flex items-center w-full px-3 py-2 border border-neutral-400/65 rounded-md text-left',
        'transition-colors focus:outline-none focus:shadow-none focus:border-[var(--color-primary)]',
        disabled ? 'bg-neutral-100 cursor-not-allowed' : 'bg-white cursor-pointer',
        error && 'border-danger-500',
        size === 'sm' ? 'text-xs' : 'text-sm'
      )}
    >
      <span
        className={classNames(
          'flex-1 min-w-0 truncate',
          value ? (disabled ? 'text-neutral-500' : 'text-neutral-800') : 'text-neutral-400'
        )}
      >
        {value || placeholder}
      </span>
      <span className="inline-flex items-center pointer-events-none text-neutral-500 ml-1">
        <Icon icon="ri:time-line" className="w-4 h-4" />
      </span>
    </button>
  );
});
