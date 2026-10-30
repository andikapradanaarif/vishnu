import type { ReactNode } from "react";

export interface AccordionProps {
	/** Label displayed in the header button. */
	label: ReactNode;
	/** Whether the accordion starts expanded. Defaults to true. Only used as initial value. */
	defaultExpanded?: boolean;
	/** Content rendered inside the collapsible body. */
	children: ReactNode;
	/** Extra className for the outer wrapper. */
	className?: string;
	/** Extra className for the body container. */
	bodyClassName?: string;
	/** Extra className for the label container. */
	labelClassName?: string;
}
