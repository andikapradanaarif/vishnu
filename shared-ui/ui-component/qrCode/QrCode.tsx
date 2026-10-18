import {QRCodeSVG} from "qrcode.react";
import type {QrCodeProps} from "./type";

// Re-export for consumers
export type {QrCodeProps};

/**
 * Renders a QR code as an inline SVG from a string value using the
 * `qrcode.react` library.
 *
 * Uses SVG output (no canvas) so it renders during SSR and is
 * resolution-independent.
 */
export function QrCode({
	value,
	size = 200,
	background = "#FFFFFF",
	foreground = "#000000",
	level = "L",
	marginSize = 0,
	className,
	title,
}: QrCodeProps) {
	return (
		<QRCodeSVG
			value={value}
			size={size}
			bgColor={background}
			fgColor={foreground}
			level={level}
			marginSize={marginSize}
			className={className}
			title={title}
		/>
	);
}
