import {useCallback, useEffect, useState} from "react";
import {createPortal} from "react-dom";
import {useIsSmallerThanTablet} from "../../hooks/useScreenSize";

interface DrawerProps {
	isOpen: boolean;
	onClose: () => void;
	children: React.ReactNode;
	title?: string;
	width?: string;
	position?: "left" | "right";
	className?: string;
	name: string;
}

const DRAWER_DURATION = 200; // ms — should match --drawer-duration

export const Drawer = ({
	isOpen,
	onClose,
	children,
	title = "",
	width = "w-160",
	position = "right",
	className = "",
	name,
}: DrawerProps) => {
	const isSmallerThanTablet = useIsSmallerThanTablet();
	const [isExiting, setIsExiting] = useState(false);

	const handleClose = useCallback(() => {
		setIsExiting(true);
		setTimeout(() => {
			setIsExiting(false);

			onClose();
		}, DRAWER_DURATION);
	}, [onClose]);

	// Handle body scroll
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden";
		}

		return () => {
			document.body.style.overflow = "unset";
		};
	}, [isOpen]);

	// Handle escape key
	useEffect(() => {
		if (!isOpen) return;

		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				handleClose();
			}
		};

		document.addEventListener("keydown", handleEscape);
		return () => {
			document.removeEventListener("keydown", handleEscape);
		};
	}, [handleClose, isOpen]);

	// Don't render anything if not open and not closing
	if (!isOpen) return null;

	const backdropClass = `shared-drawer-backdrop shared-drawer-backdrop-${isExiting ? "exit" : "enter"}`;
	const panelClass = `shared-drawer-panel shared-drawer-panel-${isExiting ? "exit" : "enter"}-${position}`;

	return createPortal(
		<div className="fixed inset-0 z-50" id={`${name}-drawer`}>
			{/* Backdrop */}
			<div className={`fixed inset-0 bg-neutral-700/40 ${backdropClass}`} onClick={handleClose} aria-hidden="true" />

			{/* Drawer */}
			<div
				className={`fixed top-0 ${position === "right" ? "right-0" : "left-0"} h-full ${isSmallerThanTablet ? "w-full" : width} bg-white shadow-xl flex flex-col ${className} ${panelClass}`}
				role="dialog"
				aria-modal="true"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b-[1px] border-solid border-neutral-300">
					<h3 className="text-lg font-medium text-neutral-900">{title}</h3>
					<button
						type="button"
						onClick={onClose}
						className="text-neutral-400 hover:text-neutral-500 focus:outline-none border-none w-[30px] h-[30px] rounded-full cursor-pointer flex items-center justify-center"
						aria-label="Close drawer"
					>
						<span className="text-2xl">&times;</span>
					</button>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-4">{children}</div>
			</div>
		</div>,
		document.body,
	);
};
