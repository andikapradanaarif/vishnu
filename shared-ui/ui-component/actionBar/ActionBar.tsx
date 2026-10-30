import classNames from "classnames";
import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Button } from "../button/Button";
import { Icon } from "@iconify/react";
import "./index.css";
import type { Language } from "../../types/translations";
import { translate } from "../../utils/translation";

interface ActionBarProps {
	selectedIds: string[] | number[];
	containerRef: RefObject<HTMLElement | null>;
	renderActions: (selectedIds: string[] | number[]) => React.ReactNode;
	onClearSelection?: () => void;
	selectionLabel?: (count: number) => string;
	language?: Language;
}

const SLIDE_DURATION = 150;

export const ActionBar = (props: ActionBarProps) => {
	const { language = "en" } = props;
	const { selectedIds, containerRef, renderActions, onClearSelection, selectionLabel } = props;

	const hasSelection = selectedIds.length > 0;

	const [visible, setVisible] = useState(false);
	const [isExiting, setIsExiting] = useState(false);
	const [container, setContainer] = useState<HTMLElement | null>(null);

	const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const rafRef = useRef<number | null>(null);

	useEffect(() => {
		setContainer(containerRef.current);
	}, [containerRef]);

	useEffect(() => {
		if (exitTimerRef.current) {
			clearTimeout(exitTimerRef.current);
			exitTimerRef.current = null;
		}
		if (rafRef.current) {
			cancelAnimationFrame(rafRef.current);
			rafRef.current = null;
		}

		if (hasSelection) {
			setVisible(true);
			setIsExiting(false);
		} else {
			setIsExiting(true);
			exitTimerRef.current = setTimeout(() => {
				setVisible(false);
				setIsExiting(false);
				exitTimerRef.current = null;
			}, SLIDE_DURATION);
		}

		return () => {
			if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
		};
	}, [hasSelection]);

	const label =
		selectionLabel?.(selectedIds.length) ??
		translate(language, "actionBar.selection.label", "{count} selected", {
			count: String(selectedIds.length),
		});

	if (!visible || !container) return null;

	return createPortal(
		<div className="sticky bottom-4 z-50 w-full pointer-events-none flex justify-center">
			<div
				role="toolbar"
				aria-label="Bulk actions"
				className={classNames(
					"pointer-events-auto bg-neutral-900 w-[50%] max-sm:w-full max-w-[600px] rounded-xl shadow-sm text-white flex flex-col justify-between",
					"gap-2 py-3 px-3 pl-4 md:flex-row sm:items-center sm:gap-4 sm:py-2",
					isExiting ? "action-bar-panel-out" : "action-bar-panel",
				)}
				style={{ transitionDuration: `${SLIDE_DURATION}ms` }}
			>
				<div>
					<span className="text-[13px] font-semibold text-neutral-200 tracking-[0.01em] whitespace-nowrap">
						{label}
					</span>
				</div>

				<div className="flex items-center gap-2">
					{onClearSelection && (
						<Button
							onClick={onClearSelection}
							aria-label="Clear selection"
							variant="text"
							className="!text-white p-2"
						>
							<Icon icon="ri-checkbox-indeterminate-line" className="mr-2 text-xl" />
							{translate(language, "common.clear", "Clear")}
						</Button>
					)}
					{renderActions(selectedIds)}
				</div>
			</div>
		</div>,
		container,
	);
};
