import { Icon } from "@iconify/react";
import { forwardRef } from "react";
import Input from "./Input";
import type { InputProps } from "./types";
import { translate } from "../../utils/translation";
import type { Language } from "../../types/translations";

interface SearchInputProps extends InputProps {
	onClear?: () => void;
	language?: Language;
}

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
	function SearchInput(props, ref) {
		const { onClear, language = "en", ...inputProps } = props;
		const defaultPlaceholder = translate(language, "search.placeholder", "Search");
		return (
			<Input
				{...inputProps}
				ref={ref}
				prefixIcon={<Icon icon="ri:search-line" />}
				isLoading={inputProps.isLoading}
				suffixIcon={onClear && inputProps.value ? <Icon icon="ri:close-line" /> : undefined}
				onSuffixIconClick={onClear}
				placeholder={inputProps.placeholder || defaultPlaceholder}
			/>
		);
	},
);

export default SearchInput;
