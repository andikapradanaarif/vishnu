import classNames from 'classnames';

interface DataListValueProps {
  children: React.ReactNode;
  className?: string;
}

export const DataListValue = ({ children, className }: DataListValueProps) => {
  return <dd className={classNames('w-full text-sm text-neutral-800', className)}>{children}</dd>;
};
