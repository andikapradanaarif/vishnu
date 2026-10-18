import classNames from "classnames";
import {useId} from "react";
import type {MouseEventHandler, PointerEventHandler, ReactNode} from "react";

import {createRipple} from "../../utils/ripple";
import {Chip} from "../chip/Chip";
import type {ChipProps} from "../chip/type";
import Tooltip from "../tooltip/Tooltip";
import {menuRoundedClassMap, menuSize} from "./utils";
import type {MenuRounded, MenuSize} from "./utils";

export interface MenuLinkProps {
	/** Text shown for the link. */
	label: string;
	/** Anchor target. */
	to: string;
	/**
	 * Click handler — not called when `disabled`. Call
	 * `event.preventDefault()` here to swap in a router's client-side navigate.
	 */
	onClick?: MouseEventHandler<HTMLAnchorElement>;
	/** Applies the active styles (e.g. when the route matches). */
	active?: boolean;
	PrefixIcon?: ReactNode;
	SuffixIcon?: ReactNode;
	chip?: ChipProps;
	disabled?: boolean;
	size?: MenuSize;
	rounded?: MenuRounded;
	className?: string;
	isCollapsed?: boolean;
}


/**
 * Link-styled menu entry, the anchor counterpart to `MenuItem`. Router-agnostic:
 * it renders a plain `<a>` and takes an `active` flag, so consumers can wire it
 * to whatever router they use.
 */
export const MenuLink = ({
	label,
	to,
	onClick,
	active = false,
	PrefixIcon,
	SuffixIcon,
	chip,
	disabled = false,
	size = "md",
	rounded = "md",
	className,
	isCollapsed = false,
}: MenuLinkProps) => {
	const tooltipId = useId().replace(/:/g, "");
	const handlePointerDown: PointerEventHandler<HTMLAnchorElement> = (event) => {
		if (disabled) return;
		createRipple(event.currentTarget, {clientX: event.clientX, clientY: event.clientY});
	};

	const link = (
		<a
			href={to}
			role="menuitem"
			aria-label={label}
			aria-disabled={disabled}
			aria-current={active ? "page" : undefined}
			tabIndex={disabled ? -1 : undefined}
			onPointerDown={handlePointerDown}
			onKeyDown={(event) => {
				// role="menuitem" implies Space activation per the ARIA menu pattern.
				if (event.key === " ") {
					event.preventDefault();
					if (!disabled) event.currentTarget.click();
				}
			}}
			onClick={(event) => {
				if (disabled) {
					event.preventDefault();
					return;
				}
				onClick?.(event);
			}}
			className={classNames(
				"relative overflow-hidden flex items-center gap-2 transition-colors",
				menuRoundedClassMap[rounded],
				isCollapsed ? "justify-center w-10 h-10" : "justify-start",
				menuSize(size),
				disabled
					? "cursor-not-allowed pointer-events-none select-none opacity-60 text-neutral-400"
					: active
						? "bg-primary-50 text-primary-600 font-medium"
						: "text-neutral-500 cursor-pointer hover:bg-primary-50 hover:text-primary-600",
				className,
			)}
		>
			{PrefixIcon && (
				<span className={classNames("shrink-0 w-5 h-5 grid place-items-center", isCollapsed && "text-base")}>
					{PrefixIcon}
				</span>
			)}

			{!isCollapsed && <span className="block truncate min-w-0">{label}</span>}

			{!isCollapsed && chip && (
				<span
					className="shrink-0"
					onClickCapture={(event) => event.preventDefault()}
					onClick={(event) => event.stopPropagation()}
				>
					<Chip {...chip} />
				</span>
			)}

			{!isCollapsed && SuffixIcon && <span className="ml-auto shrink-0 w-5 h-5 grid place-items-center">{SuffixIcon}</span>}
		</a>
	);

	if (isCollapsed) {
		return (
			<Tooltip
				id={`menu-tooltip-${tooltipId}`}
				content={label}
				position="right"
				triggerTabIndex={-1}
			>
				{link}
			</Tooltip>
		);
	}

	return link;
};
