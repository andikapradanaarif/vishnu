import type { ReactNode, RefObject } from "react";

export type TooltipPosition =
	"top" | "bottom" | "left" | "right" | "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface GetTooltipPositionParams {
	position: TooltipPosition;
	tooltipRef?: RefObject<HTMLDivElement | null>; // Optional: for dynamic dimensions
}

export type TooltipProps = {
	id: string;
	content: string;
	children: ReactNode;
	position?: TooltipPosition;
	className?: string;
	tooltipClassName?: string;
	disabled?: boolean;
	/** Tab index of the trigger wrapper — set to -1 when the child is already focusable. */
	triggerTabIndex?: number;
};
