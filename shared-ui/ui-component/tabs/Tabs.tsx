import classNames from "classnames";
import type { Tab, TabsProps } from "./type";
import Skeleton from "../loadingAnimation/Skeleton";

function Tabs<T>({ items, active, className, onChange, id, isLoading }: TabsProps<T>) {
	const handleTabClick = (tab: Tab<T>) => {
		if (!tab.disabled) {
			onChange(tab.value);
		}
	};

	if (isLoading) {
		return (
			<nav
				className={classNames(
					"-mb-px flex flex-1 min-w-0 overflow-x-auto overscroll-x-contain gap-1",
					className,
				)}
				aria-label="Tabs"
				id={`tabs-${id}`}
			>
				{items.map((_, index) => (
					<Skeleton key={index} className="h-8 w-24 shrink-0" />
				))}
			</nav>
		);
	}

	return (
		<nav
			className={classNames(
				"-mb-px flex flex-1 min-w-0 overflow-x-auto overscroll-x-contain gap-1",
				className,
			)}
			aria-label="Tabs"
			id={`tabs-${id}`}
		>
			{items.map((tab) => {
				const isActive = tab.value === active;
				return (
					<button
						id={`tab-item-${id}-${String(tab.value)}`}
						key={String(tab.value)}
						type="button"
						onClick={() => handleTabClick(tab)}
						disabled={tab.disabled}
						className={classNames(
							"relative shrink-0 whitespace-nowrap p-3 transition-all cursor-pointer flex items-center gap-2 font-medium",
							"after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:h-[2px] after:transition-all after:duration-300",
							isActive
								? "text-primary-600 after:w-2/3 after:bg-primary-500"
								: "text-neutral-500 hover:text-primary-600 after:w-0 after:bg-transparent",
							tab.disabled && "opacity-50 cursor-not-allowed",
							tab.className,
						)}
						aria-current={isActive ? "page" : undefined}
					>
						{tab.icon && <span className="inline-flex">{tab.icon}</span>}
						{tab.label}
					</button>
				);
			})}
		</nav>
	);
}

export default Tabs;
