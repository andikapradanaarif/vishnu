import classNames from "classnames";
import type { TextProps } from "./type";

export default function Subtitle({ children, className, ...props }: TextProps) {
	return (
		<h3
			{...props}
			className={classNames("text-base font-medium text-neutral-800 leading-7", className)}
		>
			{children}
		</h3>
	);
}
