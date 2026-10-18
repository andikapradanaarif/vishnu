import classNames from "classnames";
import {useState} from "react";

import {presenceAvailabilityConfig} from "../../constants/presenceStatus";
import LoadingSpinner from "../loadingAnimation/LoadingSpinner";
import {PresenceAvailability} from "../../types/presence";
import {UserAvatarFallback, type UserImageIconSize} from "./UserAvatarFallback";

function UserImageIcon({
	name,
	image,
	className,
	availability,
	showUserIcon = false,
	size = "sm",
	isLoading = false,
}: {
	name: string;
	image?: string;
	className?: string;
	availability?: PresenceAvailability;
	showUserIcon?: boolean;
	size?: UserImageIconSize;
	isLoading?: boolean;
}) {
	const [failedSrc, setFailedSrc] = useState<string | null>(null);

	const availabilityColor = availability
		? (presenceAvailabilityConfig as Record<string, {color: string} | undefined>)[String(availability)]?.color
		: undefined;

	// A dead URL falls back to the initials instead of the browser broken-image
	// glyph. The failed *URL* (not a boolean) is tracked so that when `image`
	// changes the <img> renders visible immediately — a display:none lazy image
	// is never fetched, so hiding it would deadlock the recovery path.
	const imageError = image != null && failedSrc === image;
	const showFallback = !image || imageError;

	if (isLoading) {
		return (
			<div
				id={`user-image-icon-${name}-loading`}
				className={classNames(
					`relative rounded-full bg-neutral-200 flex items-center justify-center`,
					size === "sm" && "w-8 h-8",
					size === "md" && "w-12 h-12",
					size === "lg" && "w-16 h-16",
					size === "xl" && "w-20 h-20",
					size === "2xl" && "w-24 h-24",
					size === "3xl" && "w-28 h-28",
					className,
				)}
			>
				<LoadingSpinner
					size={size === "sm" ? 12 : size === "md" ? 16 : size === "lg" ? 24 : 32}
				/>
			</div>
		);
	}

	return (
		<div
			id={`user-image-icon-${name}`}
			className={classNames(
				`relative rounded-full bg-neutral-200 flex items-center justify-center`,
				size === "sm" && "w-8 h-8",
				size === "md" && "w-12 h-12",
				size === "lg" && "w-16 h-16",
				size === "xl" && "w-20 h-20",
				size === "2xl" && "w-24 h-24",
				size === "3xl" && "w-28 h-28",
				className,
			)}
		>
			{image ? (
				<img
					key={image}
					src={image}
					alt={name}
					className={classNames("w-full h-full object-cover rounded-full", imageError && "hidden")}
					loading="lazy"
					onLoad={() => setFailedSrc(null)}
					onError={() => setFailedSrc(image)}
				/>
			) : null}

			{showFallback && <UserAvatarFallback name={name} showUserIcon={showUserIcon} size={size} />}

			{availabilityColor ? (
				<span
					className={classNames(
						"absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-current",
						availabilityColor,
					)}
				/>
			) : null}
		</div>
	);
}

export default UserImageIcon;
