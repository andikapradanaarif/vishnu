import { type PaginationProps } from "./type";
import { useIsSmallerThanTablet } from "../../hooks/useScreenSize";
import { DesktopViewPagination } from "./DesktopViewPagination";
import { MobileViewPagination } from "./MobileViewPagination";

type MainPaginationProps = Pick<
	PaginationProps,
	| "currentPage"
	| "onChangeCurrentPage"
	| "total"
	| "isFetching"
	| "pageSize"
	| "name"
	| "hideOnOnePage"
>;

export const MainPagination = (props: MainPaginationProps) => {
	const {
		currentPage,
		onChangeCurrentPage,
		total,
		isFetching = false,
		pageSize = 0,
		name,
		hideOnOnePage,
	} = props;

	const isSmallerThanTablet = useIsSmallerThanTablet();

	const totalPage: number = Math.ceil(total / pageSize);

	if ((hideOnOnePage && totalPage === 1) || pageSize === 0) {
		return null;
	}

	return (
		<div className="flex-1">
			<div className="flex justify-center">
				{!isSmallerThanTablet && (
					<DesktopViewPagination
						currentPage={currentPage}
						onChangeCurrentPage={onChangeCurrentPage}
						totalPage={totalPage}
						isFetching={isFetching}
						name={name}
					/>
				)}

				{isSmallerThanTablet && (
					<MobileViewPagination
						currentPage={currentPage}
						onChangeCurrentPage={onChangeCurrentPage}
						totalPage={totalPage}
						isFetching={isFetching}
						name={name}
					/>
				)}
			</div>
		</div>
	);
};
