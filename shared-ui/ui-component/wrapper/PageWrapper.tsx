import type { ReactNode } from "react";
import PageTitle from "../text/PageTitle";
import classNames from "classnames";

interface PageWrapperProps {
	children: ReactNode;
	title?: string;
	subtitle?: string;
	actions?: ReactNode;
	className?: string;
	overFlow?: "auto" | "hidden" | "scroll";
}

export default function PageWrapper({
	children,
	title,
	subtitle,
	actions,
	className,
	overFlow = "auto",
}: PageWrapperProps) {
	const isConstrained = overFlow === "hidden";

	return (
		// set max width to 1600 px to handle extra large screens
		<div
			className={classNames(
				className,
				`overflow-y-${overFlow}`,
				"h-full",
				isConstrained && "flex flex-col",
			)}
		>
			<div
				className={classNames(
					"px-4 md:px-8 mx-auto max-w-[1600px] py-6 w-full",
					isConstrained ? "flex-1 min-h-0 flex flex-col" : "min-h-full",
				)}
			>
				<div className="flex justify-between items-center max-sm:flex-col max-sm:justify-start max-sm:items-start max-sm:gap-2">
					{title && <PageTitle title={title} subtitle={subtitle} />}
					{actions && <div className="flex items-center gap-2">{actions}</div>}
				</div>
				<div className={classNames("mt-4", isConstrained && "flex flex-col flex-1 min-h-0")}>
					{children}
				</div>
			</div>
		</div>
	);
}
