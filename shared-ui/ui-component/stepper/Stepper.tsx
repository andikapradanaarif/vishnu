import {Icon} from "@iconify/react";
import classNames from "classnames";
import type {StepStatus, StepperProps} from "./type";

const sizeMap = {
	sm: {circle: "h-6 w-6 text-xs", icon: "text-sm", connector: "flex-1 h-0.5 min-w-6", connectorMarginTop: "0.6875rem"},
	md: {circle: "h-8 w-8 text-sm", icon: "text-base", connector: "flex-1 h-0.5 min-w-8", connectorMarginTop: "0.9375rem"},
	lg: {circle: "h-10 w-10 text-base", icon: "text-lg", connector: "flex-1 h-0.5 min-w-10", connectorMarginTop: "1.1875rem"},
} as const;

function getStepStatus(stepNum: number, currentStep: number): StepStatus {
	if (stepNum < currentStep) return "completed";
	if (stepNum === currentStep) return "current";
	return "upcoming";
}

const circleClassMap: Record<StepStatus, string> = {
	completed: "bg-success-500 text-white border-transparent",
	current: "border-2 border-primary-500 text-primary-600 bg-white",
	upcoming: "border border-neutral-300 text-neutral-400 bg-white",
};

const connectorClassMap: Record<StepStatus, string> = {
	completed: "bg-success-500",
	current: "bg-neutral-200",
	upcoming: "bg-neutral-200",
};

/**
 * A stepper component showing progress through a sequence of steps.
 *
 * Supports horizontal and vertical orientations, with labels and optional
 * descriptions for each step. Completed steps show a check icon, the current
 * step shows its number, and upcoming steps show their number in grey.
 */
export function Stepper({
	steps,
	currentStep,
	orientation = "horizontal",
	size = "md",
	className,
	renderStepContent,
}: StepperProps) {
	const sizes = sizeMap[size];

	if (orientation === "vertical") {
		return (
			<div className={classNames("flex flex-col", className)} role="list">
				{steps.map((step, i) => {
					const stepNum = i + 1;
					const status = getStepStatus(stepNum, currentStep);
					const isLast = i === steps.length - 1;

					return (
						<div key={step.id ?? stepNum} className="flex gap-3" role="listitem" aria-current={status === "current" ? "step" : undefined}>
							<div className="flex flex-col items-center min-w-0">
								<div
									className={classNames(
										"flex items-center justify-center rounded-full font-medium transition-colors shrink-0",
										sizes.circle,
										circleClassMap[status],
									)}
								>
									{status === "completed" ? (
										<Icon icon={step.icon ?? "material-symbols:check"} className={sizes.icon} />
									) : (
										stepNum
									)}
								</div>
								{!isLast && (
									<div
										className={classNames("w-0.5 flex-1 my-1", connectorClassMap[status])}
										style={{minHeight: "1.5rem"}}
									/>
								)}
							</div>
							<div className={classNames("flex flex-col", isLast ? "pb-0" : "pb-6")}>
								{step.label && (
									<span
										className={classNames(
											"text-sm font-medium",
											status === "upcoming" ? "text-neutral-400" : "text-neutral-700",
										)}
									>
										{step.label}
									</span>
								)}
								{step.description && (
									<span className="text-xs text-neutral-500 mt-0.5">{step.description}</span>
								)}
								{renderStepContent && <div className="mt-2">{renderStepContent(step, i, status)}</div>}
							</div>
						</div>
					);
				})}
			</div>
		);
	}

	return (
		<div className={classNames("flex items-start", className)} role="list">
			{steps.map((step, i) => {
				const stepNum = i + 1;
				const status = getStepStatus(stepNum, currentStep);
				const isLast = i === steps.length - 1;

				return (
					<div key={step.id ?? stepNum} className={classNames("flex items-start", !isLast && "flex-1")} role="listitem" aria-current={status === "current" ? "step" : undefined}>
						<div className="flex flex-col items-center min-w-0">
							<div
								className={classNames(
									"flex items-center justify-center rounded-full font-medium transition-colors shrink-0",
									sizes.circle,
									circleClassMap[status],
								)}
							>
								{status === "completed" ? (
									<Icon icon={step.icon ?? "material-symbols:check"} className={sizes.icon} />
								) : (
									stepNum
								)}
							</div>
							{step.label && (
								<span
									className={classNames(
										"mt-1.5 text-xs w-full max-w-full truncate block text-center",
										status === "upcoming" ? "text-neutral-400" : "text-neutral-700 font-medium",
									)}
								>
									{step.label}
								</span>
							)}
						{step.description && (
							<span className="mt-0.5 text-xs text-neutral-500 w-full max-w-full truncate block text-center">{step.description}</span>
						)}
						</div>
						{!isLast && (
							<div
								className={classNames(sizes.connector, connectorClassMap[status])}
								style={{marginTop: sizes.connectorMarginTop}}
							/>
						)}
					</div>
				);
			})}
		</div>
	);
}
