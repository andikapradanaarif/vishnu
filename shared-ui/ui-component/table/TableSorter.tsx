import { Icon } from "@iconify/react";
import classNames from "classnames";
import type { TableSortType } from "./type";

interface TableSorterProps {
	sort?: TableSortType;
}

export const TableSorter = (props: TableSorterProps) => {
	const { sort } = props;

	if (sort === undefined) {
		return (
			<div className="relative ml-2 table-sorter text-neutral-400">
				<Icon
					icon="ri:expand-up-down-line"
					className={classNames("text-md transition-all duration-300", {
						"-rotate-180": sort === "descending",
					})}
				/>
			</div>
		);
	}

	return (
		<div className="relative ml-2 table-sorter">
			<Icon
				icon="ri:arrow-drop-up-line"
				className={classNames("text-xl transition-all duration-300 text-primary-600", {
					"-rotate-180": sort === "ascending",
				})}
			/>
		</div>
	);
};
