import { type JSX } from 'react';

export interface DataListItem<RecordType> {
  /** Label shown on the left */
  label: string | JSX.Element;
  /** Access value from record */
  fnDataIndex?: (record: RecordType) => string | number | boolean | null;
  /** Custom render for complex UI */
  render?: (record: RecordType) => JSX.Element | string | number;
  /** Optional class for value cell */
  className?: string;
  /** Optional class for the row container */
  itemClassName?: string;
  /** When provided, item is only rendered if this returns true for the given record */
  visible?: (record: RecordType) => boolean;
}

/** Row direction for each label/value row. */
export type DataListDirection = 'row' | 'column';

export interface DataListProps<RecordType> {
  /** data list items */
  items: DataListItem<RecordType>[];
  /** record */
  data: RecordType;
  /** optional css className */
  className?: string;
  /** Direction of each row. Defaults to 'row'. */
  direction?: DataListDirection;
}

export interface DataListItemProps {
  children: React.ReactNode;
  direction?: DataListDirection;
  className?: string;
}

export interface DataListLabelProps {
  children: React.ReactNode;
  className?: string;
  direction?: DataListDirection;
}
