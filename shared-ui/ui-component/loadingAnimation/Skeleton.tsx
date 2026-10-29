import classNames from "classnames";
import type { HTMLAttributes } from "react";

export default function Skeleton({ className, ...restProps }: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			{...restProps}
			aria-hidden
			className={classNames("animate-pulse rounded-sm bg-neutral-200", className)}
		/>
	);
}
