import { afterEach, describe, expect, it, mock } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { Drawer } from "../Drawer";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

afterEach(() => cleanup());

describe("Drawer", () => {
	it("renders an accessible dialog when open", () => {
		render(
			<Drawer isOpen name="demo" title="Title" onClose={() => {}}>
				Body
			</Drawer>,
		);

		const dialog = screen.getByRole("dialog");
		expect(dialog.getAttribute("aria-modal")).toBe("true");
		expect(screen.getByText("Title")).toBeDefined();
	});

	it("renders nothing when closed", () => {
		render(
			<Drawer isOpen={false} name="demo" title="Title" onClose={() => {}}>
				Body
			</Drawer>,
		);

		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("closes on Escape after the exit animation", async () => {
		const onClose = mock(() => {});
		render(
			<Drawer isOpen name="demo" title="Title" onClose={onClose}>
				Body
			</Drawer>,
		);

		fireEvent.keyDown(document, { key: "Escape" });
		expect(onClose).not.toHaveBeenCalled();

		await sleep(260);
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("exposes an accessible close button", () => {
		render(
			<Drawer isOpen name="demo" title="Title" onClose={() => {}}>
				Body
			</Drawer>,
		);

		expect(screen.getByRole("button", { name: "Close drawer" })).toBeDefined();
	});
});
