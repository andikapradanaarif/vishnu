import classNames from "classnames";
import type { DataListLabelProps } from "./type";

export const DataListLabel = ({ children, className, direction = "row" }: DataListLabelProps) => {
	return (
		<dt
			className={classNames(
				"text-neutral-600 text-sm font-medium capitalize",
				direction === "column" ? "" : "min-w-[120px] text-nowrap",
				className,
			)}
		>
			{children}
		</dt>
	);
};
