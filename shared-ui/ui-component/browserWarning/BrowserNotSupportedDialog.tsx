import {Icon} from "@iconify/react";

import type {BrowserName} from "../../hooks/useBrowserSupport";
import {Button} from "../button/Button";
import {Dialog} from "../dialog/Dialog";
import Paragraph from "../text/Paragraph";
import type {BrowserNotSupportedDialogProps} from "./type";

const BROWSER_INFO: Record<Exclude<BrowserName, "other">, {label: string; icon: string; url: string}> = {
	chrome: {label: "Chrome", icon: "logos:chrome", url: "https://www.google.com/chrome/"},
	firefox: {label: "Firefox", icon: "logos:firefox", url: "https://www.mozilla.org/firefox/"},
	safari: {label: "Safari", icon: "logos:safari", url: "https://www.apple.com/safari/"},
	edge: {label: "Edge", icon: "logos:microsoft-edge", url: "https://www.microsoft.com/edge"},
};

const SUPPORTED_BROWSERS: Exclude<BrowserName, "other">[] = ["chrome", "firefox", "safari", "edge"];

/**
 * Dialog warning shown when the user's browser is unsupported or below the
 * minimum version. Pairs with the `useBrowserSupport` hook: pass its detected
 * `name` as `browserName`. Offers download links for the supported browsers.
 */
export function BrowserNotSupportedDialog({
	isOpen,
	browserName,
	onClose,
	title = "Browser not supported",
	message,
	className,
}: BrowserNotSupportedDialogProps) {
	const resolvedMessage =
		message ??
		(browserName === "other"
			? "We couldn't identify your browser. For the best experience, please use one of the supported browsers below."
			: `Your browser (${BROWSER_INFO[browserName].label}) is out of date or unsupported. Please upgrade, or switch to one of the supported browsers below.`);

	return (
		<Dialog isOpen={isOpen} onClose={onClose} title={title} disableClickOutside className={className}>
			<div className="space-y-6 pb-6">
				<Paragraph>{resolvedMessage}</Paragraph>
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
					{SUPPORTED_BROWSERS.map((browser) => {
						const info = BROWSER_INFO[browser];

						return (
							<Button
								key={browser}
								type="button"
								variant="outlined"
								className="w-full flex-col gap-2 py-4"
								onClick={() => window.open(info.url, "_blank", "noopener,noreferrer")}
							>
								<Icon icon={info.icon} width={28} height={28} />
								{info.label}
							</Button>
						);
					})}
				</div>
			</div>
		</Dialog>
	);
}
