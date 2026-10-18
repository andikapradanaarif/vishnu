export interface QrCodeProps {
	/** The value to encode in the QR code. */
	value: string;
	/** Size of the QR code in pixels. Defaults to 200. */
	size?: number;
	/** Background color. Defaults to white. */
	background?: string;
	/** Foreground color. Defaults to black. */
	foreground?: string;
	/** Error correction level. Defaults to "L". */
	level?: "L" | "M" | "Q" | "H";
	/** Margin size in modules around the QR code. Defaults to 0. */
	marginSize?: number;
	/** Extra className for the SVG element. */
	className?: string;
	/** Optional title for accessibility (rendered as SVG <title>). */
	title?: string;
}
