import {afterEach, describe, expect, it, mock} from "bun:test";
import {cleanup, fireEvent, render, screen} from "@testing-library/react";

import {BrowserNotSupportedDialog} from "../BrowserNotSupportedDialog";

afterEach(() => cleanup());

describe("BrowserNotSupportedDialog", () => {
	it("renders the heading, message and one button per supported browser", () => {
		render(<BrowserNotSupportedDialog isOpen browserName="chrome" onClose={() => {}} />);

		expect(screen.getByText("Browser not supported")).toBeDefined();
		expect(screen.getByText(/out of date or unsupported/)).toBeDefined();
		expect(screen.getByText(/\(Chrome\)/)).toBeDefined();
		expect(screen.getByRole("button", {name: "Chrome"})).toBeDefined();
		expect(screen.getByRole("button", {name: "Firefox"})).toBeDefined();
		expect(screen.getByRole("button", {name: "Safari"})).toBeDefined();
		expect(screen.getByRole("button", {name: "Edge"})).toBeDefined();
	});

	it("uses a generic message when the browser cannot be identified", () => {
		render(<BrowserNotSupportedDialog isOpen browserName="other" onClose={() => {}} />);

		expect(screen.getByText(/couldn't identify your browser/)).toBeDefined();
	});

	it("renders nothing when closed", () => {
		render(<BrowserNotSupportedDialog isOpen={false} browserName="chrome" onClose={() => {}} />);

		expect(screen.queryByText("Browser not supported")).toBeNull();
	});

	it("accepts a custom message", () => {
		render(<BrowserNotSupportedDialog isOpen browserName="chrome" onClose={() => {}} message="Please upgrade" />);

		expect(screen.getByText("Please upgrade")).toBeDefined();
	});

	it("opens the download URL when a browser button is clicked", () => {
		const open = mock(() => null);
		const original = window.open;
		window.open = open as unknown as typeof window.open;

		try {
			render(<BrowserNotSupportedDialog isOpen browserName="chrome" onClose={() => {}} />);
			fireEvent.click(screen.getByRole("button", {name: "Safari"}));

			expect(open).toHaveBeenCalledWith("https://www.apple.com/safari/", "_blank", "noopener,noreferrer");
		} finally {
			window.open = original;
		}
	});
});
