import {Icon} from "@iconify/react";
import classNames from "classnames";
import {useId, useState} from "react";
import type {AccordionProps} from "./type";

/**
 * A collapsible section with a header and content body.
 *
 * The header is a button that toggles visibility. The chevron icon rotates 180deg when collapsed.
 */
export function Accordion({
	label,
	defaultExpanded = true,
	children,
	className,
	bodyClassName,
	labelClassName,
}: AccordionProps) {
	const [isOpen, setIsOpen] = useState(defaultExpanded);
	const panelId = useId();

	return (
		<div className={classNames("space-y-3 pt-6 pb-6", className)}>
			<button
				type="button"
				onClick={() => setIsOpen((prev) => !prev)}
				className="flex w-full items-center justify-between rounded-md px-3 py-1 text-left transition-colors hover:bg-neutral-100 cursor-pointer"
				aria-expanded={isOpen}
				aria-controls={panelId}
			>
				<span className={classNames("text-sm font-semibold text-neutral-700", labelClassName)}>{label}</span>
				<Icon
					icon="material-symbols:keyboard-arrow-down"
					className={classNames(
						"text-lg text-neutral-500 transition-transform duration-200",
						!isOpen && "rotate-180",
					)}
				/>
			</button>
			<div id={panelId} className={classNames("space-y-4", bodyClassName)} hidden={!isOpen}>{children}</div>
		</div>
	);
}
