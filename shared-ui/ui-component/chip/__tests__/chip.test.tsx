import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";

import { Chip } from "../Chip";

afterEach(() => cleanup());

describe("Chip variant", () => {
	it("defaults to the subtle style", () => {
		const { container } = render(<Chip>Tag</Chip>);

		expect((container.firstElementChild as HTMLElement).className).toContain("bg-neutral-200/70");
	});

	it("uses a dark solid background with white text for variant=solid", () => {
		const { container } = render(
			<Chip variant="solid" color="red">
				Tag
			</Chip>,
		);
		const className = (container.firstElementChild as HTMLElement).className;

		expect(className).toContain("bg-danger-600");
		expect(className).toContain("text-on-primary");
	});

	it("invokes onRemove on Enter and Space keydown", () => {
		let removed = 0;
		const { container } = render(
			<Chip value="x" onRemove={() => removed++}>
				Tag
			</Chip>,
		);

		const icon = container.querySelector('[role="button"]')!;
		fireEvent.keyDown(icon, { key: "Enter" });
		fireEvent.keyDown(icon, { key: " " });
		expect(removed).toBe(2);
	});
});
