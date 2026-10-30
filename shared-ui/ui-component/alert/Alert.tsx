import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import classNames from "classnames";
import { Icon } from "@iconify/react";

import type { AlertItem, AlertSeverity } from "./type";
import type { AlertOverlayPosition } from "./type";

const EXIT_ANIMATION_MS = 180;

const overlayPositionClass: Record<AlertOverlayPosition, string> = {
	"top-right": "fixed right-4 top-4 z-50 w-[min(320px,calc(100vw-2rem))]",
	"top-left": "fixed left-4 top-4 z-50 w-[min(320px,calc(100vw-2rem))]",
	"bottom-right": "fixed right-4 bottom-4 z-50 w-[min(320px,calc(100vw-2rem))]",
	"bottom-left": "fixed left-4 bottom-4 z-50 w-[min(320px,calc(100vw-2rem))]",
	"top-center": "fixed left-1/2 top-4 -translate-x-1/2 z-50 w-[min(320px,calc(100vw-2rem))]",
	"bottom-center": "fixed left-1/2 bottom-4 -translate-x-1/2 z-50 w-[min(320px,calc(100vw-2rem))]",
};

const severityStyles: Record<AlertSeverity, { container: string }> = {
	success: {
		container: "bg-success-700/90 text-white",
	},
	info: {
		container: "bg-info-500/90 text-white",
	},
	warning: {
		container: "bg-warning-700/90 text-white",
	},
	error: {
		container: "bg-danger-700/90 text-white",
	},
	custom: {
		container: "",
	},
};

function AlertItem({
	severity,
	message,
	onClose,
	isClosing,
	colorClassName,
}: {
	severity: AlertSeverity;
	message: ReactNode | string;
	onClose: () => void;
	isClosing: boolean;
	colorClassName?: string;
}) {
	const styles = severityStyles[severity];

	const [isEntering, setIsEntering] = useState(true);

	useEffect(() => {
		const t = setTimeout(() => setIsEntering(false), 10);
		return () => clearTimeout(t);
	}, []);

	return (
		<div
			role="alert"
			className={classNames(
				"w-full rounded-lg px-4 py-2",
				"flex items-center gap-3",
				"transition-all duration-200 ease-out",
				isClosing || isEntering ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0",
				styles.container,
				colorClassName,
			)}
		>
			<div className="min-w-0 flex-1 text-sm">{message}</div>
			<button
				type="button"
				onClick={onClose}
				aria-label="Close alert"
				className={classNames(
					"flex-none rounded p-1 cursor-pointer",
					"hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-black/20",
				)}
			>
				<Icon icon="ri:close-line" className="h-5 w-5" />
			</button>
		</div>
	);
}

export default function Alert({
	alerts,
	onClose,
	variant = "overlay",
	className,
}: {
	alerts: AlertItem[];
	onClose: (id: string) => void;
	variant?: "inline" | "overlay";
	className?: string;
}) {
	const [closingIds, setClosingIds] = useState<Record<string, true>>({});
	const autoCloseTimersRef = useRef<Record<string, ReturnType<typeof setTimeout> | undefined>>({});
	const exitTimersRef = useRef<Record<string, ReturnType<typeof setTimeout> | undefined>>({});

	const closeWithTransition = useCallback(
		(id: string) => {
			setClosingIds((prev) => (prev[id] ? prev : { ...prev, [id]: true }));

			const autoTimer = autoCloseTimersRef.current[id];
			if (autoTimer) {
				clearTimeout(autoTimer);
				delete autoCloseTimersRef.current[id];
			}

			if (exitTimersRef.current[id]) {
				return;
			}

			exitTimersRef.current[id] = setTimeout(() => {
				onClose(id);
				setClosingIds((prev) => {
					const { [id]: _, ...rest } = prev;
					return rest;
				});
				delete exitTimersRef.current[id];
			}, EXIT_ANIMATION_MS);
		},
		[onClose],
	);

	useEffect(() => {
		const currentIds = new Set(alerts.map((a) => a.id));

		alerts.forEach((alert) => {
			if (
				typeof alert.duration === "number" &&
				alert.duration > 0 &&
				!autoCloseTimersRef.current[alert.id]
			) {
				autoCloseTimersRef.current[alert.id] = setTimeout(
					() => closeWithTransition(alert.id),
					alert.duration * 1000,
				);
			}
		});

		Object.keys(autoCloseTimersRef.current).forEach((id) => {
			if (!currentIds.has(id)) {
				const t = autoCloseTimersRef.current[id];
				if (t) {
					clearTimeout(t);
				}
				delete autoCloseTimersRef.current[id];
			}
		});

		Object.keys(exitTimersRef.current).forEach((id) => {
			if (!currentIds.has(id)) {
				const t = exitTimersRef.current[id];
				if (t) {
					clearTimeout(t);
				}
				delete exitTimersRef.current[id];
			}
		});
	}, [alerts, closeWithTransition]);

	useEffect(() => {
		return () => {
			Object.values(autoCloseTimersRef.current).forEach((t) => {
				if (t) {
					clearTimeout(t);
				}
			});
			Object.values(exitTimersRef.current).forEach((t) => {
				if (t) {
					clearTimeout(t);
				}
			});
			autoCloseTimersRef.current = {};
			exitTimersRef.current = {};
		};
	}, []);

	if (alerts.length === 0) {
		return null;
	}

	if (variant === "inline") {
		return (
			<div className={classNames(className, "w-full")}>
				<div className="space-y-2">
					{alerts.map((alert) => (
						<AlertItem
							key={alert.id}
							severity={alert.severity}
							message={alert.message}
							colorClassName={alert.colorClassName}
							onClose={() => closeWithTransition(alert.id)}
							isClosing={Boolean(closingIds[alert.id])}
						/>
					))}
				</div>
			</div>
		);
	}

	// Group alerts by position for toast variant
	const alertsByPosition = alerts.reduce<Record<string, AlertItem[]>>((acc, alert) => {
		const pos = alert.position || "bottom-center";
		if (!acc[pos]) acc[pos] = [];
		acc[pos].push(alert);
		return acc;
	}, {});

	return (
		<>
			{Object.entries(alertsByPosition).map(([pos, positionAlerts]) => (
				<div
					key={pos}
					className={classNames(className, overlayPositionClass[pos as AlertOverlayPosition])}
				>
					<div className="space-y-2">
						{positionAlerts.map((alert) => (
							<AlertItem
								key={alert.id}
								severity={alert.severity}
								message={alert.message}
								colorClassName={alert.colorClassName}
								onClose={() => closeWithTransition(alert.id)}
								isClosing={Boolean(closingIds[alert.id])}
							/>
						))}
					</div>
				</div>
			))}
		</>
	);
}
