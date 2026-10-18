import classNames from "classnames";
import {forwardRef} from "react";
import type {TextProps} from "./type";

const Caption = forwardRef<HTMLParagraphElement, TextProps>(({children, className}, ref) => {
	return (
		<p ref={ref} className={classNames("text-neutral-800 text-xs leading-5", className)}>
			{children}
		</p>
	);
});

Caption.displayName = "Caption";

export default Caption;
