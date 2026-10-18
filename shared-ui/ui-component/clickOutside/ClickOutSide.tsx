import { type PropsWithChildren, useEffect, useRef } from 'react';

interface ClickOutsideProps extends PropsWithChildren {
  onClickOutside: () => void;
  className?: string;
}

export const ClickOutside = (props: ClickOutsideProps) => {
  const { onClickOutside, children, className } = props;

  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        onClickOutside();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClickOutside]);

  return (
    <div ref={wrapperRef} className={className}>
      {children}
    </div>
  );
};
