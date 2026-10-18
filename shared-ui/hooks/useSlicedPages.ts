import {useState} from "react";

export function useSlicedPages({currentPage, totalPage}: {currentPage: number; totalPage: number}) {
	const [page, setPage] = useState(currentPage);
	const itemsPerPage = 5;

	const slicedPages = Array.from({length: totalPage}, (_, i) => i + 1).slice(
		Math.max(0, page - Math.floor(itemsPerPage / 2)),
		page + Math.floor(itemsPerPage / 2),
	);

	const showNavigation = totalPage > 1;
	const showNext = page < totalPage;
	const showPrev = page > 1;

	return {
		slicedPages,
		currentPage: page,
		setCurrentPage: setPage,
		showNavigation,
		showNext,
		showPrev,
	};
}
