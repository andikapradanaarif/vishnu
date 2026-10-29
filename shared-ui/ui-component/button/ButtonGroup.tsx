import classNames from "classnames";
import { Button } from "./Button";
import type { ButtonGroupProps } from "./type";

export const ButtonGroup = ({ items, className, size }: ButtonGroupProps) => {
	return (
		<div className={classNames("flex items-center rounded-md", className)}>
			{items.map((item, index) => {
				const isFirst = index === 0;
				const isLast = index === items.length - 1;

				let groupClasses = "";
				if (items.length > 1) {
					if (isFirst) {
						groupClasses = "!rounded-r-none !border-r-0";
					} else if (isLast) {
						groupClasses = "!rounded-l-none";
					} else {
						groupClasses = "!rounded-none !border-r-0";
					}
				}

				return (
					<Button
						key={index}
						size={size || item.size}
						{...item}
						className={classNames(item.className, groupClasses)}
					/>
				);
			})}
		</div>
	);
};
