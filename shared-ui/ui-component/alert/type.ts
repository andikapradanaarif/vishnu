import {ReactNode} from "react";

export type AlertOverlayPosition =
	| "top-right"
	| "top-left"
	| "bottom-right"
	| "bottom-left"
	| "top-center"
	| "bottom-center";

export type AlertSeverity = "success" | "info" | "warning" | "error" | "custom";

export type AlertInput = {
	severity: AlertSeverity;
	message: ReactNode | string;
	/** Extra classes appended after the severity classes; only guaranteed to take effect with severity="custom". */
	colorClassName?: string;
	duration?: number;
	type?: "inline" | "toast";
	id?: string;
	position?: AlertOverlayPosition;
};

export type AlertItem = AlertInput & {
	id: string;
};
