import Select from "../input/Select";
import { defaultPaginationOptions, type PaginationProps } from "./type";
import { translate } from "../../utils/translation";

type PageSizeProps = Pick<
	PaginationProps,
	"pageSize" | "onChangePageSize" | "name" | "pageSizeOptions" | "language"
>;

export const PageSize = (props: PageSizeProps) => {
	const {
		pageSize = defaultPaginationOptions[0],
		onChangePageSize,
		name,
		pageSizeOptions = [],
		language = "en",
	} = props;

	const options = pageSizeOptions.map((item) => {
		return {
			label: `${item}`,
			value: item,
		};
	});

	if (!onChangePageSize) {
		return null;
	}

	return (
		<div className="flex items-center flex-2 text-sm">
			<div className="antialiased">{translate(language, "pagination.show", "Show")}</div>

			<div className="ml-2">
				<Select
					name={`${name}-pagesize`}
					onChange={(value) => {
						onChangePageSize(value);
					}}
					options={options}
					value={pageSize}
					language={language}
				/>
			</div>
		</div>
	);
};
