import classNames from "classnames";

interface DataListRootProps {
	children: React.ReactNode;
	className?: string;
}

export const DataListRoot = ({ children, className }: DataListRootProps) => {
	return <dl className={classNames("w-full flex flex-col gap-5", className)}>{children}</dl>;
};
