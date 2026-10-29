import classNames from "classnames";
import { type JSX, useRef, type MouseEvent } from "react";
import { createRipple } from "../../utils/ripple";

interface PaginationItemProps {
	isActive: boolean;
	label: string | number | JSX.Element;
	onChangeCurrentPage: () => void;
	id?: string;
	ariaLabel?: string;
	ariaCurrent?: "page" | undefined;
	disabled?: boolean;
}

export const PaginationItem = (props: PaginationItemProps) => {
	const { isActive, label, onChangeCurrentPage, id, ariaLabel, ariaCurrent, disabled } = props;
	const buttonRef = useRef<HTMLButtonElement>(null);

	const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
		if (disabled) return;

		const button = buttonRef.current;
		if (button) {
			createRipple(button, { clientX: event.clientX, clientY: event.clientY });
		}

		onChangeCurrentPage();
	};

	return (
		<button
			id={id}
			ref={buttonRef}
			role="button"
			tabIndex={0}
			aria-label={ariaLabel}
			aria-current={ariaCurrent}
			className={classNames(
				"relative overflow-hidden p-4 w-4 h-4 rounded-sm text-sm flex justify-center items-center cursor-pointer font-normal transition-all",
				{
					"bg-primary-500 text-on-primary hover:bg-primary-600/90 transition-colors duration-200":
						isActive && !disabled,
					"bg-primary-500 text-on-primary cursor-disabled": isActive && disabled,
					"bg-neutral-100 hover:bg-neutral-200 text-neutral-800 transition-colors duration-200":
						!isActive && !disabled,
					"cursor-disabled text-neutral-400": !isActive && disabled,
				},
			)}
			onClick={handleClick}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onChangeCurrentPage();
				}
			}}
			disabled={disabled}
		>
			{label}
		</button>
	);
};
