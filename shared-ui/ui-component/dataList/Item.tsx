import classNames from "classnames";
import type { DataListItemProps } from "./type";

export const DataListItem = ({ children, direction = "row", className }: DataListItemProps) => {
	return (
		<div
			className={classNames(
				direction === "column" ? "flex flex-col gap-2" : "flex gap-2 items-center",
				className,
			)}
		>
			{children}
		</div>
	);
};
