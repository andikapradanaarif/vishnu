import classNames from 'classnames';
import type { InitRecordType, TableProps } from './type';
import { TableHeader } from './TableHeader';
import { TableBody } from './TableBody';
import { Pagination } from '../pagination/Pagination';

export const Table = <RecordType extends InitRecordType>(props: TableProps<RecordType>) => {
  const {
    columns = [],
    dataSource = [],
    tableId,
    isLoading = false,
    className,
    pagination,
    onRowClick,
    size = 'middle',
    emptyText,
    expandable,
    tableRef,
    loadingRowCount,
  } = props;

  return (
    <div ref={tableRef}>
      <div className="max-w-full w-full overflow-x-auto">
        <table className={classNames('w-full table-auto border-spacing-0 border-separate', className)} border={0}>
          <TableHeader columns={columns} tableId={tableId} size={size} hasExpandable={!!expandable} />
          <TableBody
            columns={columns}
            dataSource={dataSource}
            tableId={tableId}
            isLoading={isLoading}
            onRowClick={onRowClick}
            emptyText={emptyText}
            size={size}
            expandable={expandable}
            loadingRowCount={loadingRowCount}
          />
        </table>
      </div>
      {!!pagination && <Pagination {...pagination} name={`${tableId}-pagination`} className="mt-4" />}
    </div>
  );
};
