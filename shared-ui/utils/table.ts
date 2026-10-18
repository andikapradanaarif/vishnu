import type {InitRecordType} from "../ui-component/table/type";

/**
 * This function is used to transform api response to suits with the table data source format
 */
export const dataSourceFormatter = <T>(
	dataSource: T[] = [],
	id: keyof T | ((value: T, index: number) => string | number),
): (T & InitRecordType)[] => {
	return dataSource.map((item, index) => {
		const key = (() => {
			if (typeof id === "function") {
				return id(item, index);
			}

			return item[id] as string | number;
		})();

		return {
			...item,
			key,
		};
	});
};
