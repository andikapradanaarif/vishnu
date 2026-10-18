import { Icon } from '@iconify/react';
import { PaginationItem } from './PaginationItem';
import type { PaginationProps } from './type';
import classNames from 'classnames';
import { useSlicedPages } from '../../hooks/useSlicedPages';

type MobileViewPaginationProps = Pick<
  PaginationProps,
  'onChangeCurrentPage' | 'currentPage' | 'isFetching' | 'name'
> & {
  totalPage: number;
};

export const MobileViewPagination = (props: MobileViewPaginationProps) => {
  const { onChangeCurrentPage, currentPage, totalPage, isFetching, name } = props;

  const { showNext, showPrev } = useSlicedPages({
    currentPage,
    totalPage,
  });

  return (
    <div className="flex items-center gap-2">
      <PaginationItem
        label={
          <div>
            <Icon icon="ri:arrow-drop-left-line" className="text-2xl" />
          </div>
        }
        isActive={false}
        onChangeCurrentPage={() => {
          onChangeCurrentPage(currentPage - 1);
        }}
        disabled={isFetching || !showPrev}
        id={`${name}-prev-page`}
        ariaLabel="go to the prev page"
      />

      <div
        className={classNames('whitespace-nowrap text-sm', {
          'text-neutral-400': isFetching,
          'text-neutral-600': !isFetching,
        })}
      >{`${currentPage} / ${totalPage}`}</div>

      <PaginationItem
        label={
          <div>
            <Icon icon="ri:arrow-drop-right-line" className="text-2xl" />
          </div>
        }
        isActive={false}
        onChangeCurrentPage={() => {
          onChangeCurrentPage(currentPage + 1);
        }}
        disabled={isFetching || !showNext}
        id={`${name}-next-page`}
        ariaLabel="go to the next page"
      />
    </div>
  );
};
