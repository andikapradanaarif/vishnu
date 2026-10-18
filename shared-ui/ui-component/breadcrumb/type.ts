export interface BreadcrumbItem {
	/** Text shown for this crumb. */
	label: string;
	/** Called when the crumb is clicked. Omit to render it as plain, non-interactive text.
	 * Note: the last item always renders as non-interactive text (`aria-current="page"`),
	 * even if `onClick` is provided. */
	onClick?: () => void;
}

export interface BreadcrumbProps {
	items: BreadcrumbItem[];
	className?: string;
}
