import classNames from "classnames";
import {type ReactNode, useState, useRef, useEffect, useCallback, useLayoutEffect} from "react";
import {createPortal} from "react-dom";
import {type PopoverPosition} from "./type";
import "./index.css";
import {getPopoverPosition} from "./utils";

const POPOVER_DURATION = 80; // ms — should match --shared-popover-duration

// Measure before paint on the client; useEffect on the server, where
// useLayoutEffect does not run and React warns about it.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const ORIGIN_CLASSES: Record<PopoverPosition, string> = {
	top: "origin-bottom",
	"top-right": "origin-bottom-left",
	"top-left": "origin-bottom-right",
	bottom: "origin-top",
	"bottom-right": "origin-top-left",
	"bottom-left": "origin-top-right",
	left: "origin-right",
	right: "origin-left",
};

interface PopoverProps {
	trigger: ReactNode;
	children: ReactNode;
	position?: PopoverPosition;
	className?: string;
	rootClassName?: string;
	triggerClassName?: string;
	closeOnClickOutside?: boolean;
	id: string;
	isOpen?: boolean;
	onOpenChange?: (isOpen: boolean) => void;
	ariaLabel?: string;
	fullWidth?: boolean;
}

export function Popover({
	id,
	trigger,
	children,
	position = "bottom",
	closeOnClickOutside = true,
	isOpen: isOpenProp,
	onOpenChange,
	className = "",
	rootClassName = "",
	triggerClassName = "",
	ariaLabel,
	fullWidth = false,
}: PopoverProps) {
	const [isOpenState, setIsOpenState] = useState(false);
	const popoverRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLDivElement>(null);
	const isControlled = isOpenProp !== undefined;
	const isOpen = isControlled ? isOpenProp : isOpenState;

	const [popoverPosition, setPopoverPosition] = useState({top: 0, left: 0});
	const [popoverWidth, setPopoverWidth] = useState<number | undefined>(undefined);

	// exit animation
	const [isExiting, setIsExiting] = useState(false);

	useIsomorphicLayoutEffect(() => {
		if (!isOpen || !triggerRef.current) return;

		const updatePosition = () => {
			const tmpPopoverPosition = getPopoverPosition(triggerRef, {
				fullWidth,
				position,
				popoverRef,
			});

			if (tmpPopoverPosition) {
				setPopoverPosition(tmpPopoverPosition);
			}

			// Update width if fullWidth is enabled
			if (fullWidth && triggerRef.current) {
				setPopoverWidth(triggerRef.current.offsetWidth);
			}
		};

		// Initial position calculation
		updatePosition();

		// Recalculate on resize and scroll
		window.addEventListener("resize", updatePosition);
		window.addEventListener("scroll", updatePosition, true);

		// Observe trigger element for size changes
		const resizeObserver = new ResizeObserver(updatePosition);
		resizeObserver.observe(triggerRef.current);

		return () => {
			window.removeEventListener("resize", updatePosition);
			window.removeEventListener("scroll", updatePosition, true);
			resizeObserver.disconnect();
		};
	}, [isOpen, fullWidth, position]);

	const handleToggle = () => {
		if (isOpen) {
			// Closing - trigger exit animation
			setIsExiting(true);
			setTimeout(() => {
				setIsExiting(false);
				if (!isControlled) {
					setIsOpenState(false);
				}
				onOpenChange?.(false);
			}, POPOVER_DURATION);
		} else {
			// Opening
			if (!isControlled) {
				setIsOpenState(true);
			}
			onOpenChange?.(true);
		}
	};

	const closePopover = useCallback(() => {
		setIsExiting(true);
		setTimeout(() => {
			setIsExiting(false);
			if (!isControlled) {
				setIsOpenState(false);
			}
			onOpenChange?.(false);
		}, POPOVER_DURATION);
	}, [isControlled, onOpenChange]);

	useEffect(() => {
		if (!closeOnClickOutside || !isOpen) return;

		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Node;

			// Find all popover elements
			const clickedPopover = (target as Element).closest('[id^="popover-content-"]') as HTMLElement;

			if (!clickedPopover) {
				// Clicked outside any popover
				if (
					popoverRef.current &&
					!popoverRef.current.contains(target) &&
					triggerRef.current &&
					!triggerRef.current.contains(target)
				) {
					closePopover();
				}
				return;
			}

			// Check if the clicked popover is a descendant of current popover's trigger
			// Since child popovers are opened from triggers inside parent popover
			const isClickInsideCurrentPopover = popoverRef.current?.contains(clickedPopover);
			const isClickInsideTrigger = triggerRef.current?.contains(target);

			// Find if clicked popover's trigger is inside current popover
			const clickedPopoverTrigger = document.querySelector(`[aria-controls="${clickedPopover.id}"]`);
			const isChildPopoverTrigger = clickedPopoverTrigger && popoverRef.current?.contains(clickedPopoverTrigger);

			if (!isClickInsideCurrentPopover && !isClickInsideTrigger && !isChildPopoverTrigger) {
				closePopover();
			}
		};

		document.addEventListener("mousedown", handleClickOutside);

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [closePopover, isOpen, closeOnClickOutside]);

	// Close popover when pressing Escape key
	useEffect(() => {
		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape" && isOpen) {
				closePopover();
			}
		};

		document.addEventListener("keydown", handleEscape);
		return () => document.removeEventListener("keydown", handleEscape);
	}, [closePopover, isOpen]);

	return (
		<div className={classNames("relative inline-block", rootClassName)}>
			<div
				ref={triggerRef}
				id={id ? `popover-trigger-${id}` : undefined}
				onClick={handleToggle}
				className={classNames("cursor-pointer inline-flex", triggerClassName)}
				aria-haspopup="dialog"
				aria-expanded={isOpen}
				aria-controls={isOpen ? `popover-content-${id}` : undefined}
				aria-label={ariaLabel}
				role="button"
			>
				{trigger}
			</div>

			{(isOpen || isExiting) &&
				createPortal(
					<div
						id={`popover-content-${id}`}
						ref={popoverRef}
						role="dialog"
						aria-modal="true"
						aria-label={ariaLabel}
						style={{
							position: "fixed",
							top: `${popoverPosition.top}px`,
							left: `${popoverPosition.left}px`,
							width: fullWidth && popoverWidth ? `${popoverWidth}px` : undefined,
						}}
						className={classNames(
							// Base styles
							"z-50 bg-surface rounded-lg border border-neutral-100",
							// Custom lighter and more diffuse shadow
							"shadow-[0_2px_8px_0_rgba(0,0,0,0.04)]",

							// Sizing
							fullWidth ? "" : "min-w-[160px]",

							"shared-popover-base",
							isOpen && !isExiting && `shared-popover-enter-${position}`,
							isExiting && `shared-popover-exit-${position}`,

							// Transform origin for proper animation
							ORIGIN_CLASSES[position],

							// Custom classes
							className,
						)}
					>
						<div className="p-2">{children}</div>
					</div>,
					document.body,
				)}
		</div>
	);
}

export default Popover;
