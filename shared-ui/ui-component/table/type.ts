import { type JSX } from 'react';
import type { PaginationProps } from '../pagination/type';

/** set each record must has a key */
export interface InitRecordType {
  key: string | number;
}

/** table size type */
export type TableSizeType = 'middle' | 'small';

/** Generic Core Interface which is used on the body & header */
export interface CoreTable {
  /** table id */
  tableId: string;
  /** define the loading status */
  isLoading?: boolean;
  /** table class names */
  className?: string;
  /** pagination props */
  pagination?: Omit<PaginationProps, 'name'>;
  /** set the size of the table */
  size?: TableSizeType;
  /** Ref for the outer div wrapper */
  tableRef?: React.RefObject<HTMLDivElement | null>;
}

/** table sort type */
export type TableSortType = 'ascending' | 'descending' | undefined;

/** Table Column */
export interface TableColumn<RecordType extends InitRecordType> {
  /** set the className of the column */
  className?: string;
  /** access the value from the `fnDataIndex` attribute */
  fnDataIndex: (item: RecordType) => string | number | boolean;
  /** set the title of column */
  label: string | JSX.Element;
  /** custom render fn */
  render?: (record: RecordType) => JSX.Element | string | number;
  /** sorter table column */
  sort?: TableSortType;
  /** onChangeSort event handler */
  onChangeSort?: (value: TableSortType) => void;
}

/** Table Header Props */
export interface TableHeaderProps<RecordType extends InitRecordType> extends CoreTable {
  /** Table column */
  columns: TableColumn<RecordType>[];
  /** Whether the table has expandable rows (adds an extra column for the toggle) */
  hasExpandable?: boolean;
}

/** Define the exposed props for the table component */
type ExposedTableHeaderProps<RecordType extends InitRecordType> = Pick<TableHeaderProps<RecordType>, 'columns'>;

/**
 * Controls how the expanded content is rendered inside the table.
 *
 * - `'wrapped'` (default): wraps children in a `<tr><td>` container with
 *   background styling and a fade transition. Use this for arbitrary
 *   free-form content such as detail panels or inner tables that have
 *   their own column structure.
 *
 * - `'unwrapped'`: renders children directly as siblings of the parent row
 *   with no wrapping `<tr><td>`. Use this when the expanded content
 *   must share the same column grid as the parent table — e.g. a
 *   PatientTable nested inside an InnerTable.
 */
export type TableExpandRenderMode = 'wrapped' | 'unwrapped';

/** Expandable row configuration */
export interface TableExpandable<RecordType extends InitRecordType> {
  /**
   * Render function for the expanded row content.
   * The content is completely free-form and not bound to the column structure.
   */
  expandedRowRender: (record: RecordType) => JSX.Element;
  /** Optionally control which rows can be expanded */
  rowExpandable?: (record: RecordType) => boolean;
  /** Keys of rows that are expanded by default */
  defaultExpandedRowKeys?: (string | number)[];
  /** Callback when a row is expanded or collapsed */
  onExpand?: (expanded: boolean, record: RecordType) => void;
  /** Controls how the expanded content is rendered inside the table. */
  renderMode?: TableExpandRenderMode;
}

/** Table Body Props */
export interface TableBodyProps<RecordType extends InitRecordType>
  extends CoreTable, ExposedTableHeaderProps<RecordType> {
  /** Table Data Source */
  dataSource: RecordType[];
  /** empty text */
  emptyText?: string;
  /** onRowClick event handler */
  onRowClick?: (record: RecordType) => void;
  /** Expandable row configuration */
  expandable?: TableExpandable<RecordType>;
  /** Number of skeleton rows to render while loading (default: 5) */
  loadingRowCount?: number;
}

/** Exposed table body props */
export type ExposedTableBodyProps<RecordType extends InitRecordType> = Pick<
  TableBodyProps<RecordType>,
  'dataSource' | 'emptyText' | 'onRowClick' | 'expandable' | 'loadingRowCount'
>;

export interface RowProps<RecordType extends InitRecordType> {
  /** Record for each column */
  record: RecordType;
  /** Table column */
  columns: TableColumn<RecordType>[];
}

/** Table Component Props */
export type TableProps<RecordType extends InitRecordType> = ExposedTableHeaderProps<RecordType> &
  CoreTable &
  ExposedTableBodyProps<RecordType>;
