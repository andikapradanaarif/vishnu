import {afterEach, describe, expect, it} from "bun:test";
import {cleanup, render, screen} from "@testing-library/react";

import PageWrapper from "../PageWrapper";
import ContentWrapper from "../ContentWrapper";

afterEach(() => cleanup());

describe("PageWrapper", () => {
	it("renders the title, subtitle and actions around the children", () => {
		render(
			<PageWrapper title="Dashboard" subtitle="Overview" actions={<button>Save</button>}>
				Body
			</PageWrapper>,
		);

		expect(screen.getByText("Dashboard")).toBeDefined();
		expect(screen.getByText("Overview")).toBeDefined();
		expect(screen.getByRole("button", {name: "Save"})).toBeDefined();
		expect(screen.getByText("Body")).toBeDefined();
	});

	it("applies the overflow class from overFlow", () => {
		const {container} = render(<PageWrapper overFlow="hidden">Body</PageWrapper>);

		expect((container.firstElementChild as HTMLElement).className).toContain("overflow-y-hidden");
	});
});

describe("ContentWrapper", () => {
	it("renders a padded surface around its children", () => {
		const {container} = render(<ContentWrapper>Content</ContentWrapper>);
		const el = container.firstElementChild as HTMLElement;

		expect(el.className).toContain("min-w-0");
		expect(el.textContent).toBe("Content");
	});
});
