import classNames from "classnames";
import type {SwitchProps} from "./types";

export const Switch = (props: SwitchProps) => {
	const {name, checked, onChange, label, className, labelClassName, direction, labelPosition = "left"} = props;

	return (
		<div
			className={classNames(
				"relative flex",
				direction === "row" ? "inline-flex gap-3 items-center justify-start" : "flex-col",
				className,
			)}
		>
			{label && (labelPosition === "left" || direction !== "row") && (
				<span
					className={classNames(
						"block text-neutral-700",
						direction === "row" ? "flex items-center flex-shrink-0 text-sm h-9.5" : "text-xs mb-1",
						labelClassName,
					)}
				>
					{label}
				</span>
			)}

			<div>
				<input
					id={name}
					name={name}
					type="checkbox"
					className="sr-only"
					value={checked as unknown as string}
					onChange={(e) => {
						onChange(e.target.checked);
					}}
					checked={checked}
				/>
				<label
					htmlFor={name}
					className={classNames(
						"w-10 h-5 flex items-center cursor-pointer rounded-full border border-neutral-300 my-[9px]",
						{
							"bg-success-500": checked,
							"bg-neutral-200": !checked,
						},
					)}
				>
					<span
						className={classNames(
							"relative inline-block w-5 h-5 transition-transform duration-200 ease-in-out bg-on-primary shadow-sm rounded-full ring-0 border-solid border-[1px] border-neutral-300",
							{
								"translate-x-5 before:bg-success-400 after:scale-100": checked,
								"-translate-x-1": !checked,
							},
						)}
					/>
				</label>
			</div>
			{label && labelPosition === "right" && direction === "row" && (
				<span
					className={classNames(
						"block text-neutral-700",
						direction === "row" ? "flex items-center flex-shrink-0 text-sm h-9.5" : "text-xs mb-1",
						labelClassName,
					)}
				>
					{label}
				</span>
			)}
		</div>
	);
};
