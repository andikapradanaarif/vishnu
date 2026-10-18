import {Icon} from "@iconify/react";
import classNames from "classnames";

import type {BreadcrumbProps} from "./type";

export const Breadcrumb = ({items, className}: BreadcrumbProps) => {
	if (items.length === 0) return null;

	return (
		<nav aria-label="Breadcrumb" className={classNames("flex items-center", className)}>
			<ol className="flex items-center gap-1">
				{items.map((item, index) => {
					const isLast = index === items.length - 1;
					const isInteractive = !isLast && !!item.onClick;

					return (
						<li key={`${item.label}-${index}`} className="flex items-center gap-1">
							{isInteractive ? (
								<button
									type="button"
									onClick={item.onClick}
									className="cursor-pointer border-none bg-transparent p-0 text-xs text-neutral-500 transition-colors hover:text-primary-600"
								>
									{item.label}
								</button>
							) : (
								<span
									className={classNames(
										"text-xs",
										isLast ? "font-medium text-neutral-900" : "text-neutral-500",
									)}
									aria-current={isLast ? "page" : undefined}
								>
									{item.label}
								</span>
							)}

							{!isLast && (
								<Icon icon="material-symbols:chevron-right" className="text-neutral-400" width={16} height={16} />
							)}
						</li>
					);
				})}
			</ol>
		</nav>
	);
};
