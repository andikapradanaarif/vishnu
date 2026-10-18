export type MenuSize = "sm" | "md" | "lg";

export type MenuRounded = "md" | "lg" | "none";

export const menuSize = (size: MenuSize): string => {
	switch (size) {
		case "sm":
			return "py-1 px-2 text-xs";
		case "md":
			return "py-2 px-3 text-sm";
		case "lg":
			return "py-3 px-6 text-base";
		default:
			return "";
	}
};

export const menuRoundedClassMap: Record<MenuRounded, string> = {
	md: "rounded-lg",
	lg: "rounded-3xl",
	none: "rounded-none",
};
