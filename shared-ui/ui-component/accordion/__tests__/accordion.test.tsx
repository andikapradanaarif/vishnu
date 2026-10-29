import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { Accordion } from "../Accordion";

afterEach(() => cleanup());

describe("Accordion", () => {
	it("starts expanded and marks the trigger aria-expanded", () => {
		render(<Accordion label="Section">Body</Accordion>);

		expect(screen.getByRole("button", { name: "Section" }).getAttribute("aria-expanded")).toBe(
			"true",
		);
	});

	it("toggles open state and aria-expanded on click", () => {
		const { container } = render(<Accordion label="Section">Body</Accordion>);
		const trigger = screen.getByRole("button", { name: "Section" });

		fireEvent.click(trigger);
		expect(trigger.getAttribute("aria-expanded")).toBe("false");
		expect(container.querySelector("[hidden]")).toBeTruthy();

		fireEvent.click(trigger);
		expect(trigger.getAttribute("aria-expanded")).toBe("true");
		expect(container.querySelector("[hidden]")).toBeNull();
	});

	it("links the trigger aria-controls to the panel id", () => {
		const { container } = render(<Accordion label="Section">Body</Accordion>);
		const trigger = screen.getByRole("button", { name: "Section" });
		const panel = container.querySelector("[id]") as HTMLElement;

		expect(panel).toBeTruthy();
		expect(trigger.getAttribute("aria-controls")).toBe(panel.id);
	});

	it("can start collapsed via defaultExpanded", () => {
		render(
			<Accordion label="Section" defaultExpanded={false}>
				Body
			</Accordion>,
		);

		expect(screen.getByRole("button", { name: "Section" }).getAttribute("aria-expanded")).toBe(
			"false",
		);
	});
});
