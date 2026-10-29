import { afterEach, describe, expect, it, mock } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";

import { Breadcrumb } from "../Breadcrumb";

afterEach(() => cleanup());

describe("Breadcrumb", () => {
	it("renders all items in a labelled breadcrumb nav", () => {
		render(<Breadcrumb items={[{ label: "Home" }, { label: "Section" }, { label: "Page" }]} />);

		expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeDefined();
		expect(screen.getByText("Home")).toBeDefined();
		expect(screen.getByText("Page")).toBeDefined();
	});

	it("marks the last item as aria-current=page", () => {
		render(<Breadcrumb items={[{ label: "Home" }, { label: "Page" }]} />);

		expect(screen.getByText("Page").getAttribute("aria-current")).toBe("page");
	});

	it("calls onClick for non-last interactive crumbs", () => {
		const onClick = mock(() => {});
		render(<Breadcrumb items={[{ label: "Home", onClick }, { label: "Page" }]} />);

		fireEvent.click(screen.getByRole("button", { name: "Home" }));
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("renders the last item as plain text even when it has onClick", () => {
		const onClick = mock(() => {});
		render(<Breadcrumb items={[{ label: "Home" }, { label: "Page", onClick }]} />);

		expect(screen.queryByRole("button", { name: "Page" })).toBeNull();
	});

	it("renders one list item per crumb", () => {
		const { container } = render(
			<Breadcrumb items={[{ label: "Home" }, { label: "Section" }, { label: "Page" }]} />,
		);

		expect(container.querySelectorAll("li").length).toBe(3);
	});
});
