import type { RefObject } from "react";

export type PopoverPosition =
	"top" | "top-right" | "top-left" | "bottom" | "bottom-right" | "bottom-left" | "left" | "right";

export interface GetPopoverPositionParams {
	fullWidth: boolean;
	position: PopoverPosition;
	popoverRef?: RefObject<HTMLDivElement | null>; // Optional: for dynamic dimensions
}

export interface GetPopoverPositionResult {
	top: number;
	left: number;
	resolvedPosition: PopoverPosition;
}
