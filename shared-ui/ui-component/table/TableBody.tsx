import classNames from "classnames";
import {Fragment, useState} from "react";
import type {InitRecordType, TableBodyProps, TableSizeType} from "./type";
import Skeleton from "../loadingAnimation/Skeleton";
import {EmptyData} from "../emptyData/EmptyData";
import {Icon} from "@iconify/react";
import {ExpandedRowContent} from "./ExpandedRowContent";

const tableBodyMapSize: Record<TableSizeType, string> = {
	middle: "py-4 px-4",
	small: "py-3 px-4",
};

export const TableBody = <RecordType extends InitRecordType>(props: TableBodyProps<RecordType>) => {
	const {
		columns,
		dataSource,
		tableId,
		isLoading,
		onRowClick,
		emptyText,
		size = "middle",
		expandable,
		loadingRowCount = 5,
	} = props;

	const hasExpandable = !!expandable;
	const renderMode = expandable?.renderMode ?? "wrapped";

	// Initialize expanded keys from defaultExpandedRowKeys if provided
	const [expandedKeys, setExpandedKeys] = useState<Set<string | number>>(
		() => new Set(expandable?.defaultExpandedRowKeys ?? []),
	);

	const toggleExpand = (record: RecordType, e: React.MouseEvent) => {
		// Prevent the row-click handler from firing when toggling expansion
		e.stopPropagation();
		setExpandedKeys((prev) => {
			const next = new Set(prev);
			const expanded = !next.has(record.key);
			if (expanded) {
				next.add(record.key);
			} else {
				next.delete(record.key);
			}
			expandable?.onExpand?.(expanded, record);
			return next;
		});
	};

	// Total columns = data columns + optional expand-toggle column
	const totalColSpan = columns.length + (hasExpandable ? 1 : 0);

	return (
		<tbody
			id={`${tableId}-body`}
			className="[&>tr:last-child>td:first-child]:rounded-bl-md [&>tr:last-child>td:last-child]:rounded-br-md [&>tr>td]:border-b-[1px] [&>tr:nth-child(even)>td]:bg-neutral-50/90 [&>tr>td:first-child]:border-l-[1px] [&>tr>td:first-child]:border-l-neutral-400/65 [&>tr>td:last-child]:border-r-[1px] [&>tr>td:last-child]:border-r-neutral-400/65 [&>tr:last-child>td]:border-b-[1px] [&>tr:last-child>td]:border-b-neutral-400/65 [&>tr:not(:last-child)>td]:border-b-neutral-200"
		>
			{!isLoading && dataSource.length === 0 && (
				<tr className="text-center">
					<td colSpan={totalColSpan}>
						<EmptyData className="py-10" text={emptyText ?? "No data"} />
					</td>
				</tr>
			)}

			{isLoading &&
				Array.from({length: loadingRowCount}).map((_, rowIndex) => (
					<tr key={`skeleton-${rowIndex}`} className="bg-white">
						{hasExpandable && (
							<td className={classNames("border-solid", tableBodyMapSize[size], "w-10 text-center")}>
								<Skeleton className="h-4 w-4 mx-auto" />
							</td>
						)}
						{columns.map((column, colIndex) => (
							<td key={colIndex} className={classNames("border-solid", tableBodyMapSize[size], column.className)}>
								<Skeleton className="h-4 w-full" />
							</td>
						))}
					</tr>
				))}

			{!isLoading &&
				dataSource.map((record) => {
					const isExpandable = hasExpandable && (expandable.rowExpandable ? expandable.rowExpandable(record) : true);
					const isExpanded = expandedKeys.has(record.key);

					return (
						<Fragment key={record.key}>
							{/* Main data row */}
							<tr
								data-row="main"
								className={classNames("text-sm border-solid bg-white transition-all hover:bg-neutral-50", {
									"cursor-pointer": !!onRowClick,
								})}
								onClick={(e) => {
									e.stopPropagation();
									if (onRowClick) {
										onRowClick(record);
									}
								}}
							>
								{/* Expand toggle cell */}
								{hasExpandable && (
									<td
										className={classNames("border-solid text-neutral-400", tableBodyMapSize[size], "w-10 text-center", {
											"cursor-pointer": isExpandable,
										})}
										onClick={isExpandable ? (e) => toggleExpand(record, e) : undefined}
									>
										{isExpandable && (
											<Icon
												icon="ri:arrow-right-s-line"
												className={classNames("text-lg text-primary-500 transition-transform duration-300 ease-in-out", {
													"rotate-90": isExpanded,
												})}
											/>
										)}
									</td>
								)}

								{/* Data cells */}
								{columns.map((column, index) => {
									return (
										<td
											key={index}
											className={classNames("text-neutral-800 border-solid", tableBodyMapSize[size], column.className)}
										>
											{column?.render ? column?.render(record) : column.fnDataIndex(record) || "-"}
										</td>
									);
								})}
							</tr>

							{/* Expanded content row */}
							{isExpandable && (
								<ExpandedRowContent
									key={`${record.key}-expanded`}
									isExpanded={isExpanded}
									colSpan={totalColSpan}
									renderMode={renderMode}
								>
									{expandable.expandedRowRender(record)}
								</ExpandedRowContent>
							)}
						</Fragment>
					);
				})}
		</tbody>
	);
};
