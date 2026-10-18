import classNames from "classnames";
import {PageInformation} from "./PageInformation";
import {PageSize} from "./PageSize";
import {defaultPaginationOptions, type PaginationProps} from "./type";
import {MainPagination} from "./MainPagination";
import {useIsSmallPhone} from "../../hooks/useScreenSize";

export const Pagination = (props: PaginationProps) => {
	const {
		total,
		pageSize,
		onChangePageSize,
		currentPage,
		onChangeCurrentPage,
		className,
		name,
		hideOnOnePage = false,
		pageSizeOptions = defaultPaginationOptions,
		language = "en",
		isFetching,
	} = props;
	const isSmallPhone = useIsSmallPhone();

	return (
		<div
			className={classNames("flex justify-end", className)}
			id={`${name}-pagination`}
			role="region"
			aria-label="Pagination"
		>
			<div className="flex items-center gap-3">
				<PageInformation total={total} pageSize={pageSize} currentPage={currentPage} language={language} />

				<MainPagination
					currentPage={currentPage}
					onChangeCurrentPage={onChangeCurrentPage}
					total={total}
					pageSize={pageSize}
					name={name}
					hideOnOnePage={hideOnOnePage}
					isFetching={isFetching}
				/>

				{!isSmallPhone && (
					<PageSize
						pageSize={pageSize}
						onChangePageSize={onChangePageSize}
						name={`${name}-page-size`}
						pageSizeOptions={pageSizeOptions}
						language={language}
					/>
				)}
			</div>
		</div>
	);
};
