import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render } from "@testing-library/react";

import { DataList } from "../DataList";

afterEach(() => cleanup());

const items = [
	{ label: "Name", fnDataIndex: (record: { name: string }) => record.name },
	{ label: "Role", fnDataIndex: (record: { role: string }) => record.role },
];

describe("DataList direction", () => {
	it("defaults to row direction with a colon separator", () => {
		const { container } = render(
			<DataList items={items} data={{ name: "Ada", role: "Engineer" }} />,
		);

		expect(container.textContent).toContain("Ada");
		expect(container.textContent).toContain(":");
	});

	it("omits the colon in column direction", () => {
		const { container } = render(
			<DataList items={items} data={{ name: "Ada", role: "Engineer" }} direction="column" />,
		);

		expect(container.textContent).not.toContain(":");
		expect(container.textContent).toContain("Ada");
	});

	it("applies a per-item itemClassName to the row container", () => {
		const { container } = render(
			<DataList
				items={[
					{ label: "Name", fnDataIndex: (r: { name: string }) => r.name, itemClassName: "my-row" },
				]}
				data={{ name: "Ada" }}
			/>,
		);

		expect(container.querySelector(".my-row")).toBeTruthy();
	});
});
