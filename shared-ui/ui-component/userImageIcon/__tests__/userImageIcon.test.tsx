import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";

import UserImageIcon from "../UserImageIcon";

afterEach(() => cleanup());

describe("UserImageIcon broken-image fallback", () => {
	it("shows the initial when there is no image", () => {
		const { container } = render(<UserImageIcon name="Ada" />);

		expect(container.textContent).toContain("A");
		expect(container.querySelector("img")).toBeNull();
	});

	it("falls back to the initial when the image fails to load", () => {
		const { container } = render(<UserImageIcon name="Ada" image="https://example.com/dead.png" />);

		const img = container.querySelector("img")!;
		expect(img).toBeTruthy();

		fireEvent.error(img);

		// The broken image is hidden and the initials fallback is shown.
		expect(img.className).toContain("hidden");
		expect(container.textContent).toContain("A");
	});

	it("recovers when the image loads", () => {
		const { container } = render(<UserImageIcon name="Ada" image="https://example.com/a.png" />);
		const img = container.querySelector("img")!;

		fireEvent.error(img);
		expect(img.className).toContain("hidden");

		fireEvent.load(img);
		expect(img.className).not.toContain("hidden");
	});

	it("renders a new image URL visible after a previous failure", () => {
		const { container, rerender } = render(
			<UserImageIcon name="Ada" image="https://example.com/dead.png" />,
		);

		fireEvent.error(container.querySelector("img")!);
		expect(container.textContent).toContain("A");

		rerender(<UserImageIcon name="Ada" image="https://example.com/good.png" />);

		const img = container.querySelector("img")!;
		expect(img.getAttribute("src")).toBe("https://example.com/good.png");
		expect(img.className).not.toContain("hidden");
	});

	it("supports the 3xl size", () => {
		const { container } = render(<UserImageIcon name="Ada" size="3xl" />);

		expect((container.firstElementChild as HTMLElement).className).toContain("w-28");
	});
});
