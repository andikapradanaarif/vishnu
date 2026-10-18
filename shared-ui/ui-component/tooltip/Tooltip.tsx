import classNames from "classnames";
import {RefObject, useEffect, useRef, useState} from "react";
import {createPortal} from "react-dom";
import {GetTooltipPositionParams, TooltipProps} from "./type";

const getTooltipPosition = (triggerRef: RefObject<HTMLDivElement | null>, options: GetTooltipPositionParams) => {
	const {position, tooltipRef} = options;

	if (!triggerRef.current) return {top: 0, left: 0};

	const triggerRect = triggerRef.current.getBoundingClientRect();

	// Use actual popover dimensions if available, otherwise use estimates
	const popoverWidth = tooltipRef?.current?.offsetWidth || 160;
	const popoverHeight = tooltipRef?.current?.offsetHeight || 200;

	const gap = 8; // gap between trigger and popover (equivalent to mt-2, mb-2, etc.)

	let top = 0;
	let left = 0;

	switch (position) {
		case "top":
			top = triggerRect.top - popoverHeight - gap;
			left = triggerRect.left + triggerRect.width / 2 - popoverWidth / 2;
			break;

		case "bottom":
			top = triggerRect.bottom + gap;
			left = triggerRect.left + triggerRect.width / 2 - popoverWidth / 2;
			break;

		case "left":
			top = triggerRect.top + triggerRect.height / 2 - popoverHeight / 2;
			left = triggerRect.left - popoverWidth - gap;
			break;

		case "right":
			top = triggerRect.top + triggerRect.height / 2 - popoverHeight / 2;
			left = triggerRect.right + gap;
			break;

		case "top-left":
			top = triggerRect.top - popoverHeight - gap;
			left = triggerRect.right - popoverWidth;
			break;

		case "top-right":
			top = triggerRect.top - popoverHeight - gap;
			left = triggerRect.left;
			break;

		case "bottom-left":
			top = triggerRect.bottom + gap;
			left = triggerRect.right - popoverWidth;
			break;

		case "bottom-right":
			top = triggerRect.bottom + gap;
			left = triggerRect.left;
			break;
	}

	return {
		top,
		left,
	};
};

export function Tooltip({
	id,
	content,
	children,
	position = "top",
	className = "",
	tooltipClassName = "",
	disabled = false,
	triggerTabIndex = 0,
}: TooltipProps) {
	const [isVisible, setIsVisible] = useState(false);
	const [tooltipPosition, setTooltipPosition] = useState({top: 0, left: 0});
	// exit animation
	const [isExiting, setIsExiting] = useState(false);

	const triggerRef = useRef<HTMLDivElement>(null);
	const tooltipRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isVisible || !triggerRef.current) return;

		const updatePosition = () => {
			const tmpPopoverPosition = getTooltipPosition(triggerRef, {
				position,
				tooltipRef,
			});

			if (tmpPopoverPosition) {
				setTooltipPosition(tmpPopoverPosition);
			}
		};

		// Initial position calculation
		updatePosition();

		// Recalculate on resize and scroll
		window.addEventListener("resize", updatePosition);
		window.addEventListener("scroll", updatePosition, true);

		return () => {
			window.removeEventListener("resize", updatePosition);
			window.removeEventListener("scroll", updatePosition, true);
		};
	}, [isVisible, position]);

	const onClose = () => {
		setIsExiting(true);
		setTimeout(() => {
			setIsExiting(false);
			setIsVisible(false);
		}, 150);
	};

	return (
		<div className={classNames(className)}>
			<div
				onMouseEnter={() => setIsVisible(true)}
				onMouseLeave={onClose}
				onFocus={() => setIsVisible(true)}
				onBlur={onClose}
				aria-describedby={`tooltip-${id}`}
				tabIndex={triggerTabIndex}
				ref={triggerRef}
			>
				{children}
			</div>
			{!disabled &&
				isVisible &&
				createPortal(
					<div
						id={`tooltip-${id}`}
						ref={tooltipRef}
						role="tooltip"
						className={classNames(
							"z-50 px-2 py-2 text-sm text-white bg-neutral-900/90 rounded-md",
							"shared-tooltip-base",
							isVisible && !isExiting && `shared-tooltip-enter-${position}`,
							isExiting && `shared-tooltip-exit-${position}`,
							tooltipClassName,
						)}
						style={{
							position: "fixed",
							top: `${tooltipPosition.top}px`,
							left: `${tooltipPosition.left}px`,
						}}
					>
						{content}
					</div>,
					document.body,
				)}
		</div>
	);
}

export default Tooltip;
