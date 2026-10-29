import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";

import Tooltip from "../Tooltip";

afterEach(() => cleanup());

describe("Tooltip", () => {
	it("does not render the tooltip until the trigger is hovered", () => {
		render(
			<Tooltip id="t1" content="Hint">
				<span>trigger</span>
			</Tooltip>,
		);

		expect(document.querySelector('[role="tooltip"]')).toBeNull();
	});

	it("renders role=tooltip on hover and wires aria-describedby to its id", () => {
		const { container } = render(
			<Tooltip id="t1" content="Hint">
				<span>trigger</span>
			</Tooltip>,
		);

		const trigger = container.querySelector("[aria-describedby]")!;
		expect(trigger.getAttribute("aria-describedby")).toBe("tooltip-t1");

		fireEvent.mouseEnter(trigger);

		const tip = document.querySelector('[role="tooltip"]') as HTMLElement;
		expect(tip).toBeTruthy();
		expect(tip.id).toBe("tooltip-t1");
		expect(tip.textContent).toBe("Hint");
	});

	it("suppresses the tooltip when disabled", () => {
		const { container } = render(
			<Tooltip id="t1" content="Hint" disabled>
				<span>trigger</span>
			</Tooltip>,
		);

		fireEvent.mouseEnter(container.querySelector("[aria-describedby]")!);

		expect(document.querySelector('[role="tooltip"]')).toBeNull();
	});

	it("applies the corner animation class for corner positions", () => {
		const { container } = render(
			<Tooltip id="t1" content="Hint" position="top-left">
				<span>trigger</span>
			</Tooltip>,
		);

		fireEvent.mouseEnter(container.querySelector("[aria-describedby]")!);

		const tip = document.querySelector('[role="tooltip"]') as HTMLElement;
		expect(tip.className).toContain("shared-tooltip-enter-top-left");
	});
});
