import classNames from "classnames";
import { Children } from "react";
import type { EmptyDataProps } from "./type";

/**
 * Renders a centered "no data" placeholder with optional custom content
 * above the text.
 */
export function EmptyData({ text = "No data yet", children, className }: EmptyDataProps) {
	return (
		<div className={classNames("flex flex-col items-center", className)}>
			{children}
			<p
				className={`text-neutral-800 text-base text-center${Children.toArray(children).length > 0 ? " mt-6" : ""}`}
			>
				{text}
			</p>
		</div>
	);
}
