import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import classNames from "classnames";
import { Icon } from "@iconify/react";
import Subtitle from "../text/Subtitle";
import { createPortal } from "react-dom";

type DialogProps = {
	isOpen: boolean;
	onClose: () => void;
	title: string | ReactNode;
	children: ReactNode;
	containerClassName?: string;
	className?: string;
	titleClassName?: string;
	disableClickOutside?: boolean;
};

const DIALOG_DURATION = 60; // ms — should match

export function Dialog({
	isOpen,
	onClose,
	title,
	children,
	containerClassName = "",
	className = "",
	titleClassName = "",
	disableClickOutside = false,
}: DialogProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	const [isExiting, setIsExiting] = useState(false);

	const handleClose = useCallback(() => {
		setIsExiting(true);
		setTimeout(() => {
			setIsExiting(false);
			onClose();
		}, DIALOG_DURATION);
	}, [onClose]);

	useEffect(() => {
		if (!isOpen) return;
		const onClickOutside = () => {
			if (!disableClickOutside) handleClose();
		};

		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Node;

			// Ignore clicks on detached nodes (e.g. a control that unmounted mid-click)
			if (!document.contains(target)) {
				return;
			}

			// Ignore clicks on popovers (they're portaled siblings, not children)
			const clickedInsidePopover = (target as Element).closest('[id^="popover-content-"]');
			if (clickedInsidePopover) {
				return;
			}

			// Ignore click inside another opened dialog (they're portaled siblings, not children)
			const clickedInsideDialog = (target as Element).closest('[role="dialog"]');
			if (clickedInsideDialog) {
				return;
			}

			// Check if click is outside the dialog container
			if (containerRef.current && !containerRef.current.contains(target)) {
				onClickOutside();
			}
		};

		document.addEventListener("mousedown", handleClickOutside);

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [disableClickOutside, handleClose, isOpen]);

	if (!isOpen && !isExiting) return null;

	return createPortal(
		<div className="fixed inset-0 z-50 overflow-y-auto flex justify-center">
			<div
				className={classNames(
					"fixed inset-0 bg-black",
					isExiting ? "shared-dialog-backdrop-out" : "shared-dialog-backdrop",
				)}
				aria-hidden="true"
			/>

			<div ref={containerRef} className={containerClassName}>
				<div
					className={classNames(
						className,
						"relative rounded-lg bg-surface text-left shadow-lg p-6 sm:mt-40 mt-16",
						isExiting ? "shared-dialog-panel-out" : "shared-dialog-panel",
					)}
					role="dialog"
					aria-modal="true"
					aria-labelledby="modal-headline"
				>
					<div className="flex items-center justify-between mb-4">
						<Subtitle className={`leading-6 ${titleClassName}`} id="modal-headline">
							{title}
						</Subtitle>
						<button
							onClick={handleClose}
							className="text-neutral-400 cursor-pointer hover:text-neutral-600 transition-colors"
							aria-label="Close"
						>
							<Icon icon="mdi:close" className="w-6 h-6" />
						</button>
					</div>
					<div className="mt-2">{children}</div>
				</div>
			</div>
		</div>,
		document.body,
	);
}
