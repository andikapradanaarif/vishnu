export type RipplePointer = {
	clientX: number;
	clientY: number;
};

export function createRipple(container: HTMLElement, pointer: RipplePointer) {
	const rect = container.getBoundingClientRect();
	const size = Math.max(rect.width, rect.height) * 2;

	// Keyboard activation reports 0,0 — center the flash instead of
	// anchoring it to the top-left corner.
	const hasPointer = pointer.clientX !== 0 || pointer.clientY !== 0;
	const x = hasPointer ? pointer.clientX - rect.left : rect.width / 2;
	const y = hasPointer ? pointer.clientY - rect.top : rect.height / 2;

	// Force the target to clip the ripple. Some call sites are bare
	// links/buttons; without this the absolutely positioned span escapes
	// to the nearest positioned ancestor (the page corner).
	const computed = window.getComputedStyle(container);
	if (computed.position === "static") container.style.position = "relative";
	if (computed.overflow !== "hidden") container.style.overflow = "hidden";

	const ripple = document.createElement("span");
	ripple.className = "shared-ripple";
	ripple.style.setProperty("--shared-ripple-size", `${size}px`);
	ripple.style.setProperty("--shared-ripple-x", `${x}px`);
	ripple.style.setProperty("--shared-ripple-y", `${y}px`);

	container.appendChild(ripple);

	ripple.addEventListener(
		"animationend",
		() => {
			ripple.remove();
		},
		{once: true},
	);
}
