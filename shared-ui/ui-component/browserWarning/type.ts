import type {BrowserName} from "../../hooks/useBrowserSupport";

export interface BrowserNotSupportedDialogProps {
	/** Whether the dialog is visible. */
	isOpen: boolean;
	/** Detected browser, from `useBrowserSupport`. Used to pick the default message. */
	browserName: BrowserName;
	/** Called when the dialog's close button is clicked. */
	onClose: () => void;
	/** Dialog heading. Defaults to "Browser not supported". */
	title?: string;
	/** Body message; omit to use the built-in message derived from `browserName`. */
	message?: string;
	className?: string;
}
