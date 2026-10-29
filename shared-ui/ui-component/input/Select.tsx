import classNames from "classnames";
import { useState, useEffect, useRef, memo, useMemo } from "react";
import LoadingSpinner from "../loadingAnimation/LoadingSpinner";
import { Popover } from "../popover/Popover";
import type { SelectOption, SelectProps } from "./types";
import SearchInput from "./SearchInput";
import { filterTree, flatten } from "../../utils/array";
import Caption from "../text/Caption";
import { translate } from "../../utils/translation";
import type { Language } from "../../types/translations";

interface SelectTriggerProps {
	name: string;
	disabled?: boolean;
	isLoading?: boolean;
	isOpen: boolean;
	error?: string | boolean;
	success?: string;
	prefixIcon?: React.ReactNode;
	onPrefixIconClick?: () => void;
	selectedLabel?: string;
	placeholder?: string;
	className?: string;
	size?: "sm" | "md";
	selectedIcon?: React.ReactNode;
	showClear?: boolean;
	onClear?: () => void;
	language?: Language;
}

const SelectTrigger = memo(function SelectTrigger({
	name,
	disabled,
	isLoading,
	isOpen,
	error,
	success,
	prefixIcon,
	onPrefixIconClick,
	selectedLabel,
	placeholder,
	size = "md",
	className,
	selectedIcon,
	showClear,
	onClear,
	language = "en",
}: SelectTriggerProps) {
	return (
		<div className="relative w-full">
			<button
				type="button"
				id={`select-${name}`}
				disabled={disabled}
				title={selectedLabel || placeholder}
				className={classNames(
					"relative appearance-none flex items-center w-full min-w-0 px-3 py-2 border border-neutral-400/65 rounded-md focus:outline-none focus:shadow-none focus:border-[var(--color-primary)] text-sm text-left",
					disabled ? "bg-neutral-100 cursor-not-allowed" : "bg-surface cursor-pointer",
					isLoading || showClear ? "pr-14" : "pr-8",
					prefixIcon ? "pl-9" : "",
					error && "border-danger-500",
					success && "border-success-600",
					className,
				)}
			>
				{prefixIcon && (
					<span
						onClick={(e) => {
							if (!disabled && onPrefixIconClick) {
								e.stopPropagation();
								onPrefixIconClick();
							}
						}}
						className={classNames(
							"absolute left-3 inline-flex items-center text-neutral-500",
							disabled || !onPrefixIconClick
								? "cursor-not-allowed pointer-events-none text-neutral-400"
								: "cursor-pointer",
						)}
					>
						{prefixIcon}
					</span>
				)}

				<span className="flex items-center gap-1.5 min-w-0 flex-1">
					{selectedIcon && (
						<span className="inline-flex items-center shrink-0 text-neutral-500">
							{selectedIcon}
						</span>
					)}

					<span
						className={classNames(
							"flex-1 min-w-0 block truncate",
							!selectedLabel && "text-neutral-400",
							disabled && "text-neutral-700",
							!disabled && "text-neutral-800",
							size === "sm" ? "text-sm" : "text-base",
						)}
					>
						{selectedLabel || placeholder}
					</span>
				</span>

				{!isLoading && (
					<span
						className={classNames(
							"absolute right-3 inline-flex items-center pointer-events-none text-neutral-500",
						)}
					>
						<svg
							className={classNames("w-4 h-4 transition-transform", isOpen && "rotate-180")}
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M19 9l-7 7-7-7"
							/>
						</svg>
					</span>
				)}

				{isLoading && (
					<span className="absolute right-3 inline-flex items-center justify-center text-neutral-500">
						<LoadingSpinner size={14} />
					</span>
				)}
			</button>

			{showClear && (
				<button
					type="button"
					aria-label={translate(language, "common.clear", "Clear selection")}
					onClick={(e) => {
						e.stopPropagation();
						onClear?.();
						// The clear button unmounts once value resets; return focus to the trigger.
						document.getElementById(`select-${name}`)?.focus();
					}}
					className="absolute right-8 top-1/2 -translate-y-1/2 inline-flex items-center text-neutral-400 cursor-pointer hover:text-neutral-600"
				>
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			)}
		</div>
	);
});

export default function Select<T = string>({
	label,
	placeholder,
	name,
	value,
	options,
	onChange,
	disabled,
	isLoading,
	required,
	message,
	error,
	success,
	prefixIcon,
	onPrefixIconClick,
	direction = "column",
	className,
	isSearchable = false,
	size = "md",
	onSearch,
	onClear,
	language = "en",
}: SelectProps<T>) {
	const [isOpen, setIsOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const searchInputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);
	const hasScrolledToSelectedRef = useRef(false);

	const flattenOptions = useMemo(() => {
		return flatten(options, (item) => item.options);
	}, [options]);
	const selectedOption = flattenOptions.find((opt) => Object.is(opt.value, value));
	const isClearable = !!onClear;
	const showClear =
		isClearable && !disabled && !isLoading && (selectedOption !== undefined || value != null);

	const filteredOptions = useMemo(() => {
		if (!isSearchable) return options;
		if (!searchQuery.trim()) return options;

		const q = searchQuery.toLowerCase();

		return filterTree(
			options,
			(item) => item.options,
			(item, children) => ({ ...item, options: children }),
			(item) => item.label.toLowerCase().includes(q),
		);
	}, [options, isSearchable, searchQuery]);

	const handleSelect = (optionValue: T, option: SelectOption<T>) => {
		// filteredOptions items are shallow clones (filterTree maps to `{...item, options: []}`),
		// so resolve the consumer's original option to keep onChange's second arg reference-equal.
		const original = flattenOptions.find((o) => Object.is(o.value, optionValue));
		onChange(optionValue, original ?? option);
		setIsOpen(false);
		setSearchQuery("");
	};

	const handleSearchChange = (value: string) => {
		setSearchQuery(value);
		onSearch?.(value);
	};

	useEffect(() => {
		if (isOpen && isSearchable && searchInputRef.current) {
			searchInputRef.current.focus();
		}
	}, [isOpen, isSearchable]);

	useEffect(() => {
		if (!isOpen) {
			hasScrolledToSelectedRef.current = false;
			return;
		}

		if (hasScrolledToSelectedRef.current) {
			return;
		}

		if (!listRef.current || value === undefined) {
			return;
		}

		hasScrolledToSelectedRef.current = true;

		requestAnimationFrame(() => {
			const selectedElement = listRef.current?.querySelector(
				'[data-selected="true"]',
			) as HTMLElement;
			selectedElement?.scrollIntoView({ block: "center" });
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOpen]);

	const displayPlaceholder =
		placeholder || translate(language, "select.selectValue", "Select a value");

	return (
		<div
			className={classNames(
				"flex w-full",
				direction === "row" ? "flex-row gap-4" : "flex-col",
				className,
			)}
		>
			{label && (
				<label
					className={classNames(
						"block text-neutral-700",
						direction === "row" ? "flex items-center flex-shrink-0 w-32 text-sm" : "text-xs mb-1",
						size === "md" && direction === "row" && "h-9.5",
						size === "sm" && direction === "row" && "h-8.5",
					)}
				>
					{required && <span className="text-danger-500 mr-1">*</span>}
					{label}
				</label>
			)}
			<div className={classNames("min-w-0", direction === "row" ? "flex-1" : "")}>
				<Popover
					id={name}
					trigger={
						<SelectTrigger
							name={name}
							disabled={disabled}
							isLoading={isLoading}
							isOpen={isOpen}
							error={error}
							prefixIcon={prefixIcon}
							onPrefixIconClick={onPrefixIconClick}
							selectedLabel={selectedOption?.label}
							selectedIcon={selectedOption?.icon}
							placeholder={displayPlaceholder}
							size={size}
							showClear={showClear}
							onClear={onClear}
							language={language}
						/>
					}
					position="bottom"
					isOpen={isOpen && !disabled}
					onOpenChange={() => {
						if (!isLoading) {
							setIsOpen((prev) => !prev);
						}
					}}
					rootClassName="w-full"
					triggerClassName="w-full"
					fullWidth
					className="z-100"
				>
					<div ref={listRef} className="flex flex-col w-full max-h-56 overflow-y-auto gap-1">
						{isSearchable && (
							<div className="sticky top-0 bg-surface pb-1">
								<SearchInput
									ref={searchInputRef}
									type="text"
									name="search-gender"
									value={searchQuery}
									onChange={(e) => handleSearchChange(e.target.value)}
									placeholder={translate(language, "select.find", "Find")}
									className=""
									onClick={(e) => e.stopPropagation()}
									isLoading={isLoading}
									onClear={() => setSearchQuery("")}
									language={language}
								/>
							</div>
						)}
						{filteredOptions.length === 0 ? (
							<div className="px-3 py-2 text-sm text-neutral-400">
								{translate(language, "select.noOptions", "No options")}
							</div>
						) : (
							filteredOptions.map((option, index) => {
								return (
									<SelectItem
										key={index}
										handleSelect={handleSelect}
										option={option}
										value={value}
									/>
								);
							})
						)}
					</div>
				</Popover>
				{message && <Caption className="text-neutral-600 mt-1">{message}</Caption>}
				{error && typeof error === "string" && (
					<Caption className="text-danger-500 mt-1">{error}</Caption>
				)}
				{success && <Caption className="text-success-700 mt-1">{success}</Caption>}
			</div>
		</div>
	);
}

type SelectItemProps<T> = {
	value: T | undefined;
	option: SelectOption<T>;
	size?: "sm" | "md";
	handleSelect: (value: T, option: SelectOption<T>) => void;
};

function SelectItem<T>(props: SelectItemProps<T>) {
	const { handleSelect, option, size, value } = props;

	const hasSubMenu = !!option?.options?.length;
	const isSelected = Object.is(option.value, value);

	const [isOpen, setIsOpen] = useState(true);

	return (
		<div
			onClick={() => {
				if (!option?.disabled) {
					handleSelect(option.value, option);
				}
			}}
			data-selected={isSelected}
		>
			<div
				className={classNames(
					"w-full px-3 py-2 text-left transition-colors rounded-md flex items-center justify-between",
					option.disabled ? "cursor-disabled" : "hover:bg-primary-50 cursor-pointer",
					isSelected && "bg-primary-500/15 text-primary-600",
					!isSelected && !option.disabled && "text-neutral-800",
					size === "sm" ? "text-xs" : "text-sm",
					hasSubMenu && "hover:bg-neutral-100 cursor-pointer",
					option.className,
				)}
				onClick={() => {
					if (hasSubMenu) {
						setIsOpen((prev) => !prev);
					}
				}}
			>
				<button
					type="button"
					title={typeof option.label === "string" ? option.label : undefined}
					className={classNames(
						option.disabled && !hasSubMenu && "text-neutral-400",
						"flex min-w-0 flex-1 items-center text-left",
					)}
				>
					{option.icon && (
						<span className="inline-flex shrink-0 items-center mr-2 text-neutral-500">
							{option.icon}
						</span>
					)}
					<span className="truncate">{option.label}</span>
				</button>

				{hasSubMenu && (
					<div className="shrink-0 rounded-full hover:bg-primary-50 w-[20px] h-[20px] flex items-center justify-center">
						<svg
							className={classNames("w-4 h-4 transition-transform", isOpen ? "" : "rotate-180")}
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M19 9l-7 7-7-7"
							/>
						</svg>
					</div>
				)}
			</div>
			{hasSubMenu && (
				<div className={classNames("transition-all mt-1", isOpen ? "visible" : "hidden")}>
					{option?.options?.map((item, index) => {
						return (
							<div key={index} className="pl-2">
								<SelectItem handleSelect={handleSelect} option={item} value={value} />
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
