import type { ReactNode } from "react";

export interface Tab<T = string | number> {
	label: string | ReactNode;
	value: T;
	disabled?: boolean;
	className?: string;
	icon?: ReactNode;
}

export interface TabsProps<T = string | number> {
	id?: string;
	items: [Tab<T>, Tab<T>, ...Tab<T>[]];
	className?: string;
	active: T;
	onChange: (value: T) => void;
	isLoading?: boolean;
}
