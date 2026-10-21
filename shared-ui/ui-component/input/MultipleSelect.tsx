import classNames from "classnames";
import {useState, useEffect, useRef, memo, useMemo} from "react";
import LoadingSpinner from "../loadingAnimation/LoadingSpinner";
import {Popover} from "../popover/Popover";
import type {MultipleSelectProps, SelectOption} from "./types";
import SearchInput from "./SearchInput";
import {filterTree, flatten} from "../../utils/array";
import Caption from "../text/Caption";
import type {ReactNode} from "react";
import {Chip} from "../chip/Chip";
import {Checkbox} from "./Checkbox";
import {translate} from "../../utils/translation";
import type {Language} from "../../types/translations";

interface MultipleSelectTriggerProps {
	name: string;
	disabled?: boolean;
	isLoading?: boolean;
	isOpen: boolean;
	error?: string | boolean;
	success?: string;
	prefixIcon?: ReactNode;
	onPrefixIconClick?: () => void;
	selectedOptions: SelectOption<unknown>[];
	/** Number of selected values (may exceed selectedOptions when values aren't in options). */
	selectedCount?: number;
	placeholder?: string;
	size?: "sm" | "md";
	displayMode?: "chips" | "count";
	language?: Language;
	className?: string;
	onRemove: (value: unknown) => void;
}

const MultipleSelectTrigger = memo(function MultipleSelectTrigger({
	name,
	disabled,
	isLoading,
	isOpen,
	error,
	success,
	prefixIcon,
	onPrefixIconClick,
	selectedOptions,
	selectedCount,
	placeholder,
	size = "md",
	displayMode = "chips",
	language = "en",
	className,
	onRemove,
}: MultipleSelectTriggerProps) {
	const hasSelected =
		displayMode === "count" ? (selectedCount ?? selectedOptions.length) > 0 : selectedOptions.length > 0;

	return (
		// A div-based trigger: Popover's wrapper handles toggle clicks, and chips'
		// own remove control must not nest inside a native <button>.
		<div
			role="button"
			tabIndex={disabled ? -1 : 0}
			aria-disabled={disabled}
			id={`select-${name}`}
			onClick={
				disabled
					? (e) => {
							e.preventDefault();
							e.stopPropagation();
						}
					: undefined
			}
			onKeyDown={(e) => {
				if (disabled || e.repeat) return;
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					e.currentTarget.click();
				}
			}}
			className={classNames(
				"appearance-none flex items-center w-full px-3 py-2 border border-neutral-400/65 rounded-md focus:outline-none focus:shadow-none focus:border-[var(--color-primary)] text-sm text-left min-h-[38px]",
				disabled ? "bg-neutral-100 cursor-not-allowed" : "bg-surface cursor-pointer",
				isLoading ? "pr-14" : "pr-8",
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
						disabled || !onPrefixIconClick ? "cursor-not-allowed pointer-events-none text-neutral-400" : "cursor-pointer",
					)}
				>
					{prefixIcon}
				</span>
			)}

			<span className="flex-1 flex flex-wrap gap-1 min-w-0">
				{hasSelected ? (
					displayMode === "count" ? (
						<span className={classNames("text-neutral-800", size === "sm" ? "text-xs" : "text-sm")}>
							{translate(language, "multipleSelect.selectedCount", "{count} selected", {
								count: String(selectedCount ?? selectedOptions.length),
							})}
						</span>
					) : (
						selectedOptions.map((opt, i) => (
							<Chip
								key={i}
								size={size}
								removeAriaLabel={translate(language, "common.remove", "Remove")}
								// `value` only gates the remove icon's visibility in Chip; fall back to a
								// non-empty sentinel so options with an empty-string value stay removable.
								value={String(opt.value) || "-"}
								onRemove={disabled ? undefined : () => onRemove(opt.value)}
							>
								{opt.icon && <span className="inline-flex items-center mr-2 text-neutral-500">{opt.icon}</span>}
								{opt.label}
							</Chip>
						))
					)
				) : (
					<span className={classNames("text-neutral-400", size === "sm" ? "text-xs" : "text-sm")}>{placeholder}</span>
				)}
			</span>

			{!isLoading && (
				<span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center pointer-events-none text-neutral-500">
					<svg
						className={classNames("w-4 h-4 transition-transform", isOpen && "rotate-180")}
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
					</svg>
				</span>
			)}

			{isLoading && (
				<span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center text-neutral-500">
					<LoadingSpinner size={14} />
				</span>
			)}
		</div>
	);
});

type SelectAllState = "all" | "some" | "none";

interface SelectAllItemProps {
	state: SelectAllState;
	onClick: () => void;
	size?: "sm" | "md";
	/**
	 * True when maxSelected is already reached and none of the visible items
	 * are selected — clicking would do nothing, so we dim the row.
	 */
	maxReached: boolean;
	language: Language;
}

function SelectAllItem({state, onClick, size = "md", maxReached, language}: SelectAllItemProps) {
	const isAll = state === "all";
	const isSome = state === "some";

	return (
		<div
			onClick={maxReached ? undefined : onClick}
			className={classNames(
				"w-full px-3 py-2 text-left transition-colors rounded-md flex items-center gap-2",
				maxReached ? "cursor-not-allowed opacity-40" : "hover:bg-primary-50 cursor-pointer",
				size === "sm" ? "text-xs" : "text-sm",
			)}
		>
			{/* Tri-state checkbox */}
			<span
				className={classNames(
					"flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors",
					isAll
						? "bg-primary-600 border-primary-600"
						: isSome
							? "bg-surface border-primary-600"
							: "border-neutral-300 bg-surface",
				)}
			>
				{isAll && (
					<svg className="w-2.5 h-2.5 text-on-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
					</svg>
				)}
				{/* Indeterminate dash */}
				{isSome && <span className="w-2 h-0.5 bg-primary-600 rounded-sm block" />}
			</span>

			<span className="flex-1 font-medium text-neutral-700">
				{isAll
					? translate(language, "multipleSelect.deselectAll", "Deselect All")
					: translate(language, "multipleSelect.selectAll", "Select All")}
			</span>
		</div>
	);
}

export default function MultipleSelect<T = string>({
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
	maxSelected,
	popoverClassName,
	popoverFullWidth = true,
	displayMode = "chips",
	language = "en",
}: MultipleSelectProps<T>) {
	const [isOpen, setIsOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const searchInputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);

	const flattenOptions = useMemo(() => flatten(options, (item) => item.options), [options]);

	const selectedOptions = useMemo(
		() => flattenOptions.filter((opt) => value.some((v) => Object.is(opt.value, v))),
		[flattenOptions, value],
	);

	const filteredOptions = useMemo(() => {
		if (!isSearchable || !searchQuery.trim()) return options;
		const q = searchQuery.toLowerCase();
		return filterTree(
			options,
			(item) => item.options,
			(item, children) => ({...item, options: children}),
			(item) => item.label.toLowerCase().includes(q),
		);
	}, [options, isSearchable, searchQuery]);

	/**
	 * Leaf nodes within the currently visible (filtered) option tree,
	 * excluding disabled ones — these are the candidates for Select All.
	 */
	const filteredLeafNodes = useMemo(() => {
		const flat = flatten(filteredOptions, (item) => item.options);
		return flat.filter((opt) => !opt.options?.length && !opt.disabled);
	}, [filteredOptions]);

	const selectedFilteredCount = filteredLeafNodes.filter((opt) => value.some((v) => Object.is(v, opt.value))).length;

	const selectAllState: SelectAllState =
		selectedFilteredCount === 0 ? "none" : selectedFilteredCount === filteredLeafNodes.length ? "all" : "some";

	/**
	 * maxReached: the limit is full AND none of the currently visible leaf
	 * nodes are selected (so clicking Select All would genuinely do nothing).
	 */
	const maxReached = maxSelected !== undefined && value.length >= maxSelected && selectAllState === "none";

	const handleSelectAll = () => {
		if (selectAllState === "all") {
			// Deselect every visible leaf node
			const filteredValues = new Set(filteredLeafNodes.map((o) => o.value));
			onChange(value.filter((v) => !filteredValues.has(v)));
		} else {
			// Add unselected visible leaf nodes, capped by maxSelected
			const alreadySelected = new Set(value);
			const toAdd = filteredLeafNodes.filter((o) => !alreadySelected.has(o.value)).map((o) => o.value);
			const slots = maxSelected !== undefined ? maxSelected - value.length : Infinity;
			onChange([...value, ...toAdd.slice(0, slots)]);
		}
	};

	const handleSelect = (optionValue: T) => {
		const isAlreadySelected = value.some((v) => Object.is(v, optionValue));
		if (isAlreadySelected) {
			onChange(value.filter((v) => !Object.is(v, optionValue)));
		} else {
			if (maxSelected !== undefined && value.length >= maxSelected) return;
			onChange([...value, optionValue]);
		}
	};

	const handleRemove = (optionValue: T) => {
		if (disabled) return;
		onChange(value.filter((v) => !Object.is(v, optionValue)));
	};

	const handleSearchChange = (val: string) => {
		setSearchQuery(val);
		onSearch?.(val);
	};

	useEffect(() => {
		if (isOpen && isSearchable && searchInputRef.current) {
			searchInputRef.current.focus();
		}
	}, [isOpen, isSearchable]);

	const displayPlaceholder = placeholder || translate(language, "multipleSelect.selectValue", "Select a value");

	return (
		<div className={classNames("flex", direction === "row" ? "flex-row gap-4" : "flex-col", className)}>
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
			<div className={classNames(direction === "row" ? "flex-1" : "")}>
				<Popover
					id={name}
					trigger={
						<MultipleSelectTrigger
							name={name}
							disabled={disabled}
							isLoading={isLoading}
							isOpen={isOpen}
							error={error}
							prefixIcon={prefixIcon}
							onPrefixIconClick={onPrefixIconClick}
							selectedOptions={selectedOptions as SelectOption<unknown>[]}
							selectedCount={value.length}
							placeholder={displayPlaceholder}
							size={size}
							displayMode={displayMode}
							language={language}
							onRemove={(v) => handleRemove(v as T)}
						/>
					}
					position="bottom"
					isOpen={isOpen && !disabled}
					onOpenChange={() => {
						if (!isLoading) setIsOpen((prev) => !prev);
					}}
					fullWidth={popoverFullWidth}
					rootClassName="w-full"
					triggerClassName="w-full"
					className={classNames("z-100", popoverClassName)}
				>
					<div ref={listRef} className="flex flex-col w-full max-h-56 overflow-y-auto gap-1">
						{isSearchable && (
							<div className="sticky top-0 bg-surface pb-1">
								<SearchInput
									ref={searchInputRef}
									type="text"
									name={`search-${name}`}
									value={searchQuery}
									onChange={(e) => handleSearchChange(e.target.value)}
									placeholder={translate(language, "multipleSelect.find", "Find")}
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
								{translate(language, "multipleSelect.noOptions", "No options")}
							</div>
						) : (
							<>
								{/* ── Select All row ─────────────────────────────── */}
								<SelectAllItem
									state={selectAllState}
									onClick={handleSelectAll}
									size={size}
									maxReached={maxReached}
									language={language}
								/>
								<div className="border-t border-neutral-100 mx-2" />

								{/* ── Regular options ────────────────────────────── */}
								{filteredOptions.map((option, index) => (
									<MultipleSelectItem
										key={index}
										option={option}
										value={value}
										handleSelect={handleSelect}
										size={size}
									/>
								))}
							</>
						)}
					</div>
				</Popover>

				{maxSelected !== undefined && (
					<Caption className="text-neutral-400 mt-1">
						{translate(language, "multipleSelect.selectedCountMax", "{count}/{max} selected", {
							count: String(value.length),
							max: String(maxSelected),
						})}
					</Caption>
				)}
				{message && <Caption className="text-neutral-600 mt-1">{message}</Caption>}
				{typeof error === "string" && error && <Caption className="text-danger-500 mt-1">{error}</Caption>}
				{success && <Caption className="text-success-700 mt-1">{success}</Caption>}
			</div>
		</div>
	);
}

// ─── SelectItem ───────────────────────────────────────────────────────────────

type MultipleSelectItemProps<T> = {
	value: T[];
	option: SelectOption<T>;
	size?: "sm" | "md";
	handleSelect: (value: T) => void;
};

function MultipleSelectItem<T>({handleSelect, option, size, value}: MultipleSelectItemProps<T>) {
	const hasSubMenu = !!option?.options?.length;
	const isSelected = value.some((v) => Object.is(v, option.value));
	const [isOpen, setIsOpen] = useState(true);

	const onChecked = () => {
		if (!option?.disabled && !hasSubMenu) {
			handleSelect(option.value);
		}
	};

	return (
		<div onClick={onChecked} data-selected={isSelected}>
			<div
				className={classNames(
					"w-full px-3 py-2 text-left transition-colors rounded-md flex items-center justify-between gap-2",
					option.disabled ? "cursor-disabled" : hasSubMenu ? "cursor-default" : "hover:bg-primary-50 cursor-pointer",
					isSelected && "bg-primary-500/15 text-primary-600",
					!isSelected && !option.disabled && "text-neutral-800",
					size === "sm" ? "text-xs" : "text-sm",
					hasSubMenu && "hover:bg-neutral-100 cursor-pointer",
					option.className,
				)}
				onClick={(e) => {
					if (hasSubMenu) {
						e.stopPropagation();
						setIsOpen((prev) => !prev);
					}
				}}
			>
				{/* Checkbox for leaf nodes only */}
				{!hasSubMenu && (
					<Checkbox disabled={option.disabled} checked={isSelected} id={option.label} onChecked={onChecked} />
				)}

				<span className={classNames("flex-1 inline-flex items-center gap-2", option.disabled && !hasSubMenu && "text-neutral-400")}>
					{option.icon && <span className="inline-flex items-center text-neutral-500">{option.icon}</span>}
					{option.label}
				</span>

				{hasSubMenu && (
					<div className="cursor-pointer rounded-full hover:bg-primary-50 w-[20px] h-[20px] flex items-center justify-center">
						<svg
							className={classNames("w-4 h-4 transition-transform", isOpen ? "" : "rotate-180")}
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
						</svg>
					</div>
				)}
			</div>

			{hasSubMenu && (
				<div className={classNames("transition-all mt-1", isOpen ? "visible" : "hidden")}>
					{option?.options?.map((item, index) => (
						<div key={index} className="pl-2">
							<MultipleSelectItem handleSelect={handleSelect} option={item} value={value} size={size} />
						</div>
					))}
				</div>
			)}
		</div>
	);
}
