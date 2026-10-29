import classNames from "classnames";
import { forwardRef } from "react";
import type { TextProps } from "./type";

const Paragraph = forwardRef<HTMLParagraphElement, TextProps>(
	({ children, className, size = "md", ...props }, ref) => {
		return (
			<p
				ref={ref}
				{...props}
				className={classNames(
					"text-neutral-800 leading-6",
					size === "md" && "text-sm",
					size === "lg" && "text-base",
					className,
				)}
			>
				{children}
			</p>
		);
	},
);

Paragraph.displayName = "Paragraph";

export default Paragraph;
