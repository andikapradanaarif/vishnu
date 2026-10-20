/**
 * Pixel spinner: a half-block glyph rotated in discrete steps so the
 * motion feels like a CRT pinwheel rather than a smooth web loader.
 */
export function Spinner({
	className,
	size = "md",
}: {
	className?: string;
	size?: "sm" | "md" | "lg";
}) {
	const fontSize = size === "sm" ? "text-sm" : size === "lg" ? "text-3xl" : "text-xl";
	return (
		<span
			role="status"
			aria-label="loading"
			className={`step-spin inline-block leading-none ${fontSize} ${className ?? ""}`}
		>
			▚
		</span>
	);
}
