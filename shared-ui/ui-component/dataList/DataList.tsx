import { DataListItem } from "./Item";
import { DataListLabel } from "./Label";
import { DataListRoot } from "./Root";
import type { DataListProps } from "./type";
import { DataListValue } from "./Value";

export const DataList = <RecordType,>(props: DataListProps<RecordType>) => {
	const { data, items = [], className, direction = "row" } = props;

	return (
		<DataListRoot className={className}>
			{items.map((item, index) => {
				if (item.visible && !item.visible(data)) return null;

				return (
					<DataListItem key={index} direction={direction} className={item.itemClassName}>
						<DataListLabel direction={direction}>{item.label}</DataListLabel>
						{direction === "row" && <span className="text-sm">:</span>}
						<DataListValue className={item.className}>
							{item.render ? item.render(data) : (item.fnDataIndex?.(data) ?? "-")}
						</DataListValue>
					</DataListItem>
				);
			})}
		</DataListRoot>
	);
};
