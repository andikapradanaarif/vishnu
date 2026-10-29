import classNames from "classnames";

interface MessageProps {
	children: React.ReactNode;
	severity?: "success" | "error" | "warning" | "info" | "custom";
	size?: "sm" | "xs";
	className?: string;
	/** Extra classes appended after the severity classes; only guaranteed to take effect with severity="custom". */
	colorClassName?: string;
}

export default function Message({
	children,
	severity = "info",
	size = "sm",
	className,
	colorClassName,
}: MessageProps) {
	if (children === "") {
		return <></>;
	}
	return (
		<div
			className={classNames(
				"rounded-md",
				severity === "success" && "bg-success-100/70 text-success-800",
				severity === "error" && "bg-danger-50 text-danger-700",
				severity === "warning" && "bg-warning-100/70 text-warning-800",
				severity === "info" && "bg-info-50 text-info-800",
				size === "xs" && "py-3 px-4 text-xs leading-5",
				size === "sm" && "py-3 px-3 text-sm leading-6",
				className,
				colorClassName,
			)}
		>
			{children}
		</div>
	);
}
