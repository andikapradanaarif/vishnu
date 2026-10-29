import { afterEach, describe, expect, it, mock } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import Alert from "../Alert";
import type { AlertItem } from "../type";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

afterEach(() => cleanup());

describe("Alert", () => {
	it("renders each alert with role=alert and its message", () => {
		const alerts: AlertItem[] = [{ id: "1", severity: "info", message: "Saved" }];

		render(<Alert alerts={alerts} onClose={() => {}} />);

		expect(screen.getByRole("alert").textContent).toContain("Saved");
	});

	it("exposes an accessible dismiss button that closes after the exit animation", async () => {
		const onClose = mock(() => {});
		const alerts: AlertItem[] = [{ id: "1", severity: "info", message: "Saved", type: "inline" }];

		render(<Alert variant="inline" alerts={alerts} onClose={onClose} />);

		const button = screen.getByRole("button", { name: "Close alert" });
		fireEvent.click(button);

		// Not closed synchronously — it waits for the exit animation.
		expect(onClose).not.toHaveBeenCalled();

		await sleep(260);
		expect(onClose).toHaveBeenCalledWith("1");
	});

	it("auto-closes after the configured duration", async () => {
		const onClose = mock(() => {});
		const alerts: AlertItem[] = [
			{ id: "a", severity: "success", message: "Done", type: "inline", duration: 0.05 },
		];

		render(<Alert variant="inline" alerts={alerts} onClose={onClose} />);

		await sleep(320);
		expect(onClose).toHaveBeenCalledWith("a");
	});

	it("renders nothing when there are no alerts", () => {
		const { container } = render(<Alert alerts={[]} onClose={() => {}} />);

		expect(container.firstChild).toBeNull();
	});
});
