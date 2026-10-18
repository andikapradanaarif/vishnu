import type {PaginationProps} from "./type";
import {translate} from "../../utils/translation";

type PageInformationProps = Pick<PaginationProps, "total" | "pageSize" | "currentPage" | "language">;

export const PageInformation = (props: PageInformationProps) => {
	const {total, pageSize = 0, currentPage, language = "en"} = props;

	const firstItem = (currentPage - 1) * pageSize + 1;
	const lastItem = Math.min(currentPage * pageSize, total);

	const text = translate(language, "pagination.range", "{first} - {last} of {total}", {
		first: String(firstItem),
		last: String(lastItem),
		total: String(total),
	});

	return <div className="antialiased nowrap text-sm">{text}</div>;
};
