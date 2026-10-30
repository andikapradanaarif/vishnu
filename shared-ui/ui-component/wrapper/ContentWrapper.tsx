import type { ReactNode } from "react";
import classNames from "classnames";

interface ContentWrapperProps {
	children: ReactNode;
	className?: string;
	padding?: string;
}

export default function ContentWrapper({
	children,
	className,
	padding = "sm:px-6 px-4 py-6",
}: ContentWrapperProps) {
	return (
		<div className={classNames("min-w-0 bg-surface rounded-xl", padding, className)}>
			{children}
		</div>
	);
}
