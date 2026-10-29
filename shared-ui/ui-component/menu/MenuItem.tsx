import { useRef } from "react";
import classNames from "classnames";
import { createRipple } from "../../utils/ripple";
import { Chip } from "../chip/Chip";
import type { ChipProps } from "../chip/type";
import Tooltip from "../tooltip/Tooltip";
import { menuRoundedClassMap, menuSize } from "./utils";
import type { MenuRounded, MenuSize } from "./utils";

interface MenuItemProps {
	label: string;
	value: string | number;
	onClickMenu: (index: number | string) => void;
	PrefixIcon?: React.ReactNode;
	SuffixIcon?: React.ReactNode;
	selectedMenu?: string | number | null;
	disabled?: boolean;
	size?: MenuSize;
	className?: string;
	activeClassName?: string;
	chip?: ChipProps;
	isCollapsed?: boolean;
	rounded?: MenuRounded;
}

function MenuItem({
	PrefixIcon,
	value,
	label,
	selectedMenu = null,
	onClickMenu,
	disabled = false,
	size = "md",
	className,
	SuffixIcon,
	activeClassName,
	chip,
	isCollapsed = false,
	rounded = "md",
}: MenuItemProps) {
	const navRef = useRef<HTMLElement>(null);

	const handlePointerDown: React.PointerEventHandler<HTMLDivElement> = (event) => {
		if (disabled) return;
		createRipple(event.currentTarget, { clientX: event.clientX, clientY: event.clientY });
	};

	const roundedClass = menuRoundedClassMap[rounded];

	const menuItem = (
		<nav
			ref={navRef}
			id={`menu-item-${value}`}
			className={classNames(
				"relative overflow-hidden flex cursor-pointer items-center",
				roundedClass,
				isCollapsed ? "justify-center w-10 h-10" : "justify-between",
				menuSize(size),
				selectedMenu === value
					? activeClassName || "bg-primary-50 text-primary-600"
					: "text-neutral-500",
				disabled
					? "text-neutral-400 cursor-not-allowed pointer-events-none select-none opacity-60"
					: "hover:bg-primary-50 hover:text-primary-600 cursor-pointer",
				className,
			)}
			onPointerDown={handlePointerDown}
			onClick={() => {
				if (disabled) return;
				onClickMenu(value);
			}}
			aria-label={label}
			aria-disabled={disabled}
			role="menuitem"
		>
			<div className="flex gap-2 items-center text-center">
				{PrefixIcon && (
					<span
						className={classNames("w-5 h-5 grid place-items-center", isCollapsed && "text-base")}
					>
						{PrefixIcon}
					</span>
				)}
				{!isCollapsed && <span>{label}</span>}
				{!isCollapsed && chip && <Chip {...chip} />}
			</div>
			{!isCollapsed && SuffixIcon && (
				<span className="w-5 h-5 grid place-items-center">{SuffixIcon}</span>
			)}
		</nav>
	);

	if (isCollapsed) {
		return (
			<Tooltip id={`menu-tooltip-${value}`} content={label} position="right">
				{menuItem}
			</Tooltip>
		);
	}

	return menuItem;
}

export default MenuItem;
