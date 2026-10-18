export type ButtonVariant = "filled" | "outlined" | "text";
export type ButtonColor = "primary" | "danger" | "other" | "custom";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	type?: "submit" | "reset" | "button";
	variant?: ButtonVariant;
	color?: ButtonColor;
	/** Extra classes appended after the variant classes; only guaranteed to take effect with color="custom". */
	colorClassName?: string;
	className?: string;
	onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
	disabled?: boolean;
	isLoading?: boolean;
	form?: string;
	size?: ButtonSize;
	icon?: React.ReactNode;
	iconPosition?: "left" | "right";
	rounded?: "none" | "md" | "lg";
}

export interface ButtonGroupProps {
	items: ButtonProps[];
	className?: string;
	size?: ButtonSize;
}
