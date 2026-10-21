import {RefObject} from "react";
import {GetPopoverPositionParams, GetPopoverPositionResult, PopoverPosition} from "./type";

// Maps each position to its flipped counterpart on the primary axis
const FLIP_MAP: Record<PopoverPosition, PopoverPosition> = {
	top: "bottom",
	"top-right": "bottom-right",
	"top-left": "bottom-left",
	bottom: "top",
	"bottom-right": "top-right",
	"bottom-left": "top-left",
	left: "right",
	right: "left",
};

/**
 * Determines whether the popover is clipped in the viewport for a given position,
 * and returns the best position to use (flipped or original).
 * If both directions are constrained, the original position is kept.
 */
const resolvePosition = (
	triggerRect: DOMRect,
	popoverWidth: number,
	popoverHeight: number,
	position: PopoverPosition,
	gap: number,
): PopoverPosition => {
	const vw = window.innerWidth;
	const vh = window.innerHeight;

	const isCroppedForPosition = (pos: PopoverPosition): boolean => {
		switch (pos) {
			case "top":
			case "top-right":
			case "top-left":
				return triggerRect.top - popoverHeight - gap < 0;
			case "bottom":
			case "bottom-right":
			case "bottom-left":
				return triggerRect.bottom + popoverHeight + gap > vh;
			case "left":
				return triggerRect.left - popoverWidth - gap < 0;
			case "right":
				return triggerRect.right + popoverWidth + gap > vw;
		}
	};

	const isCropped = isCroppedForPosition(position);
	if (!isCropped) return position;

	const flipped = FLIP_MAP[position];
	const isFlippedCropped = isCroppedForPosition(flipped);

	// If flipping also clips, keep the original position
	if (isFlippedCropped) return position;

	return flipped;
};

export const getPopoverPosition = (
	triggerRef: RefObject<HTMLDivElement | null>,
	options: GetPopoverPositionParams,
): GetPopoverPositionResult => {
	const {fullWidth, position, popoverRef} = options;

	if (!triggerRef.current) return {top: 0, left: 0, resolvedPosition: position};

	const triggerRect = triggerRef.current.getBoundingClientRect();

	// Prefer the measured popover size (content can exceed the trigger
	// width); fall back to the trigger width, then a rough estimate.
	const popoverWidth = popoverRef?.current?.offsetWidth || (fullWidth ? triggerRect.width : 160);
	const popoverHeight = popoverRef?.current?.offsetHeight || 200;

	const gap = 8; // gap between trigger and popover (equivalent to mt-2, mb-2, etc.)

	const resolvedPosition = resolvePosition(triggerRect, popoverWidth, popoverHeight, position, gap);

	let top = 0;
	let left = 0;

	switch (resolvedPosition) {
		case "top":
			top = triggerRect.top - popoverHeight - gap;
			left = triggerRect.left + triggerRect.width / 2 - popoverWidth / 2;
			break;

		case "top-right":
			top = triggerRect.top - popoverHeight - gap;
			left = triggerRect.left;
			break;

		case "top-left":
			top = triggerRect.top - popoverHeight - gap;
			left = triggerRect.right - popoverWidth;
			break;

		case "bottom":
			top = triggerRect.bottom + gap;
			left = triggerRect.left + triggerRect.width / 2 - popoverWidth / 2;
			break;

		case "bottom-right":
			top = triggerRect.bottom + gap;
			left = triggerRect.left;
			break;

		case "bottom-left":
			top = triggerRect.bottom + gap;
			left = triggerRect.right - popoverWidth;
			break;

		case "left":
			top = triggerRect.top + triggerRect.height / 2 - popoverHeight / 2;
			left = triggerRect.left - popoverWidth - gap;
			break;

		case "right":
			top = triggerRect.top + triggerRect.height / 2 - popoverHeight / 2;
			left = triggerRect.right + gap;
			break;
	}

	// Keep the popover inside the viewport horizontally.
	const vw = window.innerWidth;
	left = Math.min(Math.max(left, 8), Math.max(8, vw - popoverWidth - 8));

	return {top, left, resolvedPosition};
};
