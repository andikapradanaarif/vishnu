export type TextFont = "normal" | "medium" | "semibold" | "bold";

export interface TextProps extends React.HTMLAttributes<HTMLHeadingElement> {
	children: React.ReactNode;
	className?: string;
	size?: "sm" | "md" | "lg" | "xl";
	font?: TextFont;
}

export interface PageTitleProps {
	title: string;
	subtitle?: string;
}
