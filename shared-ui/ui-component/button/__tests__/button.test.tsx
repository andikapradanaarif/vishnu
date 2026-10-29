import { afterEach, describe, expect, it, mock } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { Button } from "../Button";

afterEach(() => cleanup());

describe("Button disabled styling", () => {
	it("uses the filled disabled treatment for non-text variants", () => {
		render(<Button disabled>Save</Button>);

		const button = screen.getByRole("button", { name: "Save" });
		expect(button.className).toContain("disabled:!bg-neutral-400");
		expect(button.className).toContain("disabled:!text-white");
		expect((button as HTMLButtonElement).disabled).toBe(true);
	});

	it("uses the transparent disabled treatment for the text variant", () => {
		render(
			<Button variant="text" disabled>
				Link
			</Button>,
		);

		const button = screen.getByRole("button", { name: "Link" });
		expect(button.className).toContain("disabled:!bg-transparent");
		expect(button.className).toContain("disabled:!text-neutral-400");
	});

	it("suppresses onClick while disabled or loading", () => {
		const onClick = mock(() => {});
		const { container } = render(
			<Button isLoading onClick={onClick}>
				Go
			</Button>,
		);

		fireEvent.click(container.querySelector("button")!);
		expect(onClick).not.toHaveBeenCalled();
	});
});
