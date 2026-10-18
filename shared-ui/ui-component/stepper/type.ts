import type {ReactNode} from "react";

/** State of a single step in the stepper. */
export type StepStatus = "completed" | "current" | "upcoming";

/** A single step in the stepper. */
export interface StepperStep {
	/** Label shown next to the step indicator. Optional — when omitted, only the numbered circle is shown. */
	label?: string;
	/** Optional description shown below the label. */
	description?: string;
	/** Optional unique identifier for the step. Used as React key when provided, otherwise falls back to the 1-based step number. */
	id?: string;
	/** Optional icon override for the completed step indicator (defaults to check). Only used when the step is completed. */
	icon?: string;
}

export type StepperOrientation = "horizontal" | "vertical";

/** Size preset for the step indicator circles. */
export type StepperSize = "sm" | "md" | "lg";

export interface StepperProps {
	/** The steps to render. */
	steps: StepperStep[];
	/** The 1-based index of the current step. Steps before this are "completed", this one is "current", and steps after are "upcoming". */
	currentStep: number;
	/** Layout direction of the steps. */
	orientation?: StepperOrientation;
	/** Size of the step indicator circles. Defaults to `md`. */
	size?: StepperSize;
	/** Optional className for the root element. */
	className?: string;
	/** Optional renderer for the step content (e.g. children inside a section). Only used in vertical mode — ignored in horizontal mode. */
	renderStepContent?: (step: StepperStep, index: number, status: StepStatus) => ReactNode;
}
