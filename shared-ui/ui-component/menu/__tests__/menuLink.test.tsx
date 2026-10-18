import {afterEach, describe, expect, it, mock} from "bun:test";
import {cleanup, fireEvent, render, screen} from "@testing-library/react";

import {MenuLink} from "../MenuLink";

afterEach(() => cleanup());

describe("MenuLink", () => {
	it("renders an anchor with role, aria-label and href", () => {
		render(<MenuLink label="Dashboard" to="/dashboard" />);

		const link = screen.getByRole("menuitem", {name: "Dashboard"});
		expect(link.getAttribute("href")).toBe("/dashboard");
	});

	it("marks the active link with aria-current=page", () => {
		render(<MenuLink label="Home" to="/" active />);

		expect(screen.getByRole("menuitem", {name: "Home"}).getAttribute("aria-current")).toBe("page");
	});

	it("marks disabled links aria-disabled and out of the tab order", () => {
		render(<MenuLink label="Settings" to="/settings" disabled />);

		const link = screen.getByRole("menuitem", {name: "Settings"});
		expect(link.getAttribute("aria-disabled")).toBe("true");
		expect(link.getAttribute("tabindex")).toBe("-1");
	});

	it("renders a chip when provided", () => {
		render(<MenuLink label="Inbox" to="/inbox" chip={{children: "3"}} />);

		expect(screen.getByText("3")).toBeDefined();
	});

	it("invokes consumer onClick on click", () => {
		const onClick = mock(() => {});
		render(<MenuLink label="Settings" to="/settings" onClick={onClick} />);

		fireEvent.click(screen.getByRole("menuitem", {name: "Settings"}));

		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("does not invoke consumer onClick and prevents default when disabled", () => {
		const onClick = mock(() => {});
		render(<MenuLink label="Settings" to="/settings" disabled onClick={onClick} />);

		const link = screen.getByRole("menuitem", {name: "Settings"});
		// fireEvent.click returns false when the event's default was prevented.
		const notPrevented = fireEvent.click(link);

		expect(onClick).not.toHaveBeenCalled();
		expect(notPrevented).toBe(false);
	});

	it("hides the label and chip when collapsed and keeps a single tab stop", () => {
		const {container} = render(<MenuLink label="Inbox" to="/inbox" isCollapsed chip={{children: "3"}} />);

		const link = container.querySelector("a")!;
		expect(link.getAttribute("tabIndex")).not.toBe("-1");
		// Label/chip spans are not rendered in collapsed mode.
		expect(container.querySelectorAll("span.block.truncate")).toHaveLength(0);
		expect(container.textContent).not.toContain("Inbox");
		expect(container.textContent).not.toContain("3");
	});

	it("activates on Space per the menuitem role contract", () => {
		const onClick = mock();
		const {container} = render(<MenuLink label="Settings" to="/settings" onClick={onClick} />);

		const link = container.querySelector("a")!;
		fireEvent.keyDown(link, {key: " "});
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("does not activate on Space when disabled", () => {
		const onClick = mock();
		const {container} = render(<MenuLink label="Settings" to="/settings" disabled onClick={onClick} />);

		const link = container.querySelector("a")!;
		fireEvent.keyDown(link, {key: " "});
		expect(onClick).not.toHaveBeenCalled();
	});
});
