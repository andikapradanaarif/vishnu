export type RipplePointer = {
	clientX: number;
	clientY: number;
};

export function createRipple(container: HTMLElement, pointer: RipplePointer) {
	const rect = container.getBoundingClientRect();
	const size = Math.max(rect.width, rect.height) * 2;

	const x = pointer.clientX - rect.left;
	const y = pointer.clientY - rect.top;

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
