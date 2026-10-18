import {afterEach, describe, expect, it, mock} from "bun:test";
import {cleanup, fireEvent, render, screen} from "@testing-library/react";

import {Dialog} from "../Dialog";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

afterEach(() => cleanup());

describe("Dialog", () => {
	it("renders an accessible modal when open", () => {
		render(
			<Dialog isOpen onClose={() => {}} title="Title">
				Body
			</Dialog>,
		);

		const dialog = screen.getByRole("dialog");
		expect(dialog.getAttribute("aria-modal")).toBe("true");
		expect(dialog.getAttribute("aria-labelledby")).toBe("modal-headline");
		expect(screen.getByText("Title")).toBeDefined();
	});

	it("renders nothing when closed", () => {
		render(
			<Dialog isOpen={false} onClose={() => {}} title="Title">
				Body
			</Dialog>,
		);

		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("closes via the accessible close button after the exit animation", async () => {
		const onClose = mock(() => {});
		render(
			<Dialog isOpen onClose={onClose} title="Title">
				Body
			</Dialog>,
		);

		fireEvent.click(screen.getByRole("button", {name: "Close"}));
		expect(onClose).not.toHaveBeenCalled();

		await sleep(120);
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("closes on an outside mousedown", async () => {
		const onClose = mock(() => {});
		render(
			<Dialog isOpen onClose={onClose} title="Title">
				Body
			</Dialog>,
		);

		fireEvent.mouseDown(document.body);

		await sleep(120);
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("does not close when the mousedown target was detached during dispatch", async () => {
		const onClose = mock(() => {});
		render(
			<Dialog isOpen onClose={onClose} title="Title">
				Body
			</Dialog>,
		);

		const btn = document.createElement("button");
		btn.addEventListener("mousedown", () => btn.remove());
		document.body.appendChild(btn);

		fireEvent.mouseDown(btn);

		await sleep(120);
		expect(onClose).not.toHaveBeenCalled();
	});

	it("renders a ReactNode title inside the labelledby element", () => {
		render(
			<Dialog isOpen onClose={() => {}} title={<span data-testid="custom-title">Node Title</span>}>
				Body
			</Dialog>,
		);

		const headline = document.getElementById("modal-headline");
		expect(headline?.contains(screen.getByTestId("custom-title"))).toBe(true);
	});
});
