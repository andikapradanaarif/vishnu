import {Icon} from "@iconify/react";
import classNames from "classnames";

export type UserImageIconSize = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";

const iconSizeClass: Record<UserImageIconSize, string> = {
	sm: "w-4 h-4",
	md: "w-6 h-6",
	lg: "w-8 h-8",
	xl: "w-10 h-10",
	"2xl": "w-12 h-12",
	"3xl": "w-14 h-14",
};

const textSizeClass: Record<UserImageIconSize, string> = {
	sm: "text-sm",
	md: "text-xl",
	lg: "text-2xl",
	xl: "text-3xl",
	"2xl": "text-3xl",
	"3xl": "text-4xl",
};

export interface UserAvatarFallbackProps {
	/** Display name — the first letter is shown as the fallback initial. */
	name: string;
	/** When true, show a user icon instead of the initial. */
	showUserIcon: boolean;
	/** Avatar size preset. */
	size: UserImageIconSize;
}

/**
 * Fallback content for a user avatar when there is no image or the image fails
 * to load — either a user icon or the first letter of the name.
 */
export function UserAvatarFallback({name, showUserIcon, size}: UserAvatarFallbackProps) {
	if (showUserIcon) {
		return <Icon icon="ri-user-fill" className={classNames("text-neutral-500 shrink-0", iconSizeClass[size])} />;
	}

	return <p className={classNames("capitalize text-primary-600", textSizeClass[size])}>{name?.[0] ?? "?"}</p>;
}

export default UserAvatarFallback;
