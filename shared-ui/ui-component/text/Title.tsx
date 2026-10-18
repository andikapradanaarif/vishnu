import classNames from "classnames";
import type {TextProps} from "./type";

const fontClassMap: Record<NonNullable<TextProps["font"]>, string> = {
	normal: "font-normal",
	medium: "font-medium",
	semibold: "font-semibold",
	bold: "font-bold",
};

const sizeClassMap: Record<NonNullable<TextProps["size"]>, string> = {
	sm: "text-sm",
	md: "text-md",
	lg: "text-lg",
	xl: "text-xl",
};

export default function Title({children, className, size = "xl", font = "semibold", ...props}: TextProps) {
	return (
		<h1 {...props} className={classNames("text-neutral-800", sizeClassMap[size], fontClassMap[font], className)}>
			{children}
		</h1>
	);
}
