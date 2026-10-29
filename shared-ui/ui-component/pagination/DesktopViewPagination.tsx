import { Icon } from "@iconify/react";
import { useSlicedPages } from "../../hooks/useSlicedPages";
import { PaginationItem } from "./PaginationItem";
import type { PaginationProps } from "./type";
import Skeleton from "../loadingAnimation/Skeleton";

type DesktopViewPaginationProps = Pick<
	PaginationProps,
	"currentPage" | "onChangeCurrentPage" | "isFetching" | "name"
> & {
	totalPage: number;
};

export const DesktopViewPagination = (props: DesktopViewPaginationProps) => {
	const { currentPage, onChangeCurrentPage, isFetching, totalPage, name } = props;

	const { slicedPages, showNavigation, showNext, showPrev } = useSlicedPages({
		currentPage,
		totalPage,
	});

	// Nothing to paginate yet — show placeholder skeletons during the first load.
	if (isFetching && totalPage === 0) {
		return (
			<div className="flex items-center gap-1">
				{Array.from({ length: 3 }, (_, index) => (
					<Skeleton key={index} className="w-12 h-12" />
				))}
			</div>
		);
	}

	return (
		<div className="flex items-center gap-1">
			{showNavigation && showPrev && (
				<PaginationItem
					label={
						<div>
							<Icon icon="ri:arrow-drop-left-line" className="text-2xl" />
						</div>
					}
					isActive={false}
					disabled={isFetching}
					onChangeCurrentPage={() => {
						onChangeCurrentPage(currentPage - 1);
					}}
					id={`${name}-prev-page`}
					ariaLabel="go to the prev page"
				/>
			)}

			{slicedPages.map((page) => {
				const isActive = page === currentPage;

				return (
					<PaginationItem
						key={page}
						isActive={isActive}
						label={page}
						disabled={isFetching}
						onChangeCurrentPage={() => {
							onChangeCurrentPage(page);
						}}
						ariaLabel={`go to the ${page}`}
						id={`${name}-page-${page}`}
					/>
				);
			})}

			{showNavigation && showNext && (
				<PaginationItem
					label={
						<div>
							<Icon icon="ri:arrow-drop-right-line" className="text-2xl" />
						</div>
					}
					isActive={false}
					disabled={isFetching}
					onChangeCurrentPage={() => {
						onChangeCurrentPage(currentPage + 1);
					}}
					id={`${name}-next-page`}
					ariaLabel="go to the next page"
				/>
			)}
		</div>
	);
};
