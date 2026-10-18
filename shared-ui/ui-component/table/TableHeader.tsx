import classNames from 'classnames';
import type { InitRecordType, TableHeaderProps, TableSizeType, TableSortType } from './type';
import { TableSorter } from './TableSorter';

const tableHeaderMapSize: Record<TableSizeType, string> = {
  middle: 'py-5 px-4',
  small: 'py-3 px-4',
};

export const TableHeader = <RecordType extends InitRecordType>(props: TableHeaderProps<RecordType>) => {
  const { columns, tableId, size = 'middle', hasExpandable = false } = props;

  return (
    <thead id={`${tableId}-header`}>
      <tr className="[&>th:first-child]:border-l-[1px] [&>th:first-child]:rounded-tl-md [&>th:last-child]:border-r-[1px] [&>th]:border-t-[1px] [&>th:last-child]:rounded-tr-md">
        {/* Expand toggle column header */}
        {hasExpandable && (
          <th
            className={classNames(
              'text-sm text-left text-neutral-800 font-normal bg-neutral-200/60 border-solid border-neutral-400/65 w-10',
              tableHeaderMapSize[size]
            )}
          />
        )}
        {columns.map((column, index) => {
          return (
            <th
              key={index}
              className={classNames(
                'text-sm text-left text-neutral-800 font-normal bg-neutral-200/60 border-solid border-neutral-400/65 transition-all',
                tableHeaderMapSize[size],
                {
                  'cursor-pointer hover:bg-neutral-300/65': !!column?.onChangeSort,
                  'bg-neutral-300/55': column?.sort !== undefined,
                },
                column.className
              )}
              onClick={() => {
                if (column?.onChangeSort) {
                  const nextValue: TableSortType = (() => {
                    switch (column?.sort) {
                      case 'ascending': {
                        return 'descending';
                      }
                      case 'descending': {
                        return undefined;
                      }
                      default: {
                        return 'ascending';
                      }
                    }
                  })();
                  column.onChangeSort(nextValue);
                }
              }}
            >
              <div className="flex items-center gap-1 inline-flex">
                <div className="font-semibold text-neutral-700/85">{column.label}</div>
                {Object.hasOwn(column, 'sort') && <TableSorter sort={column.sort} />}
              </div>
            </th>
          );
        })}
      </tr>
    </thead>
  );
};
