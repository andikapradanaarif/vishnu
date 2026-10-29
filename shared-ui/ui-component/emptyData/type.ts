import type { ReactNode } from "react";

export interface EmptyDataProps {
	/** Text to display. Defaults to "No data yet". */
	text?: string;
	/** Optional custom content (e.g. an image) rendered above the text. */
	children?: ReactNode;
	/** Extra className for the outer wrapper. */
	className?: string;
}
