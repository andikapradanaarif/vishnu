import classNames from "classnames";
import { useCallback } from "react";
import type { ReactNode } from "react";

interface FormListOperation<T = unknown> {
	add: (defaultValue?: T, insertIndex?: number) => void;
	remove: (index: number | number[]) => void;
}

interface FormListProps<T = unknown> {
	name: string;
	values: T[];
	onChange: (values: T[]) => void;
	children: (fields: T[], operation: FormListOperation<T>) => ReactNode;
	defaultValue?: T;
	label?: string;
	required?: boolean;
	direction?: "column" | "row";
}

export const FormList = <T = unknown,>(props: FormListProps<T>) => {
	const {
		name,
		values,
		onChange,
		children,
		defaultValue,
		label,
		required,
		direction = "column",
	} = props;

	const add = useCallback(
		(value?: T, insertIndex?: number) => {
			const newItem = value ?? (defaultValue as T);
			if (insertIndex !== undefined) {
				const next = [...values];
				next.splice(insertIndex, 0, newItem);
				onChange(next);
			} else {
				onChange([...values, newItem]);
			}
		},
		[values, onChange, defaultValue],
	);

	const remove = useCallback(
		(index: number | number[]) => {
			const indices = new Set(Array.isArray(index) ? index : [index]);
			onChange(values.filter((_, i) => !indices.has(i)));
		},
		[values, onChange],
	);

	return (
		<div
			className={classNames("flex", direction === "row" ? "flex-row gap-4" : "flex-col")}
			id={name}
		>
			{label && (
				<label
					className={classNames(
						"block text-neutral-700",
						direction === "row"
							? "flex items-start flex-shrink-0 w-32 text-sm pt-1.5"
							: "text-xs mb-1",
					)}
				>
					{required && <span className="text-danger-500 mr-1">*</span>}
					{label}
				</label>
			)}
			<div className={direction === "row" ? "flex-1" : ""}>{children(values, { add, remove })}</div>
		</div>
	);
};
